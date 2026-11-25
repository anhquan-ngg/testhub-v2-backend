import { z } from 'zod';
import { Extraction, OcrPage, ocrPageSchema } from './document.contract';

export const OCR_DELIVERY_LIMIT = 30;
export const OCR_MAX_DELIVERIES = 500;
export const planOcrSchema = z
  .object({ revision: z.number().int().positive(), consent: z.literal(true) })
  .strict();
export const retryPlanOcrSchema = planOcrSchema
  .extend({ version_id: z.string().uuid() })
  .strict();
export const ocrRequestSchema = z
  .object({
    origin_plan_id: z.string().uuid(),
    origin_revision: z.number().int().positive(),
    parent_version_id: z.string().uuid(),
    retry_of_version_id: z.string().uuid().nullable().default(null),
    positions: z.array(z.number().int().min(1).max(500)).min(1).max(500),
    pages: z.array(ocrPageSchema).min(1).max(500),
    deliveries: z.number().int().min(0).max(OCR_MAX_DELIVERIES),
    status: z.enum(['PENDING', 'COMPLETED', 'INCOMPLETE']),
  })
  .strict();
export type OcrRequest = z.infer<typeof ocrRequestSchema>;

/** Preserve already-added transcripts while processing one bounded set of new pages. */
export function mergeOcrCheckpoint({
  previous,
  current,
  request,
  attempted,
}: {
  previous: Extraction;
  current: Extraction;
  request: OcrRequest;
  attempted: number[];
}): { extraction: Extraction; request: OcrRequest; pending: boolean } {
  if (
    previous.source_sha256 !== current.source_sha256 ||
    previous.source_type !== current.source_type ||
    previous.include_notes !== current.include_notes ||
    previous.unit_count !== current.unit_count
  )
    throw new Error('OCR checkpoint source changed');
  const base = current.source_type === 'PDF' ? 'PAGE' : 'SLIDE';
  const reported = new Map(
    (current.quality?.ocr_pages ?? []).map((page) => [page.position, page]),
  );
  const attemptedSet = new Set(attempted);
  const delivered = request.pages.map(
    (page): OcrPage =>
      attemptedSet.has(page.position)
        ? (reported.get(page.position) ?? {
            position: page.position,
            status: 'FAILED',
            reason: 'PROVIDER_ERROR',
          })
        : page,
  );
  const advanced = delivered.some(
    (page) =>
      attemptedSet.has(page.position) &&
      ['COMPLETED', 'NO_TEXT'].includes(page.status),
  );
  const deliveries = request.deliveries + 1;
  // PAGE_LIMIT is a smaller configured per-step cap, not a request to retry failures or daily budgets.
  const pages = delivered
    .map(
      (page): OcrPage =>
        page.status === 'PENDING' && attemptedSet.has(page.position)
          ? {
              position: page.position,
              status: 'FAILED',
              reason: 'PROVIDER_ERROR',
            }
          : page.status === 'BUDGET_EXHAUSTED' &&
              page.reason === 'PAGE_LIMIT' &&
              advanced &&
              deliveries < OCR_MAX_DELIVERIES
            ? { position: page.position, status: 'PENDING' }
            : page,
    )
    .map(
      (page): OcrPage =>
        deliveries >= OCR_MAX_DELIVERIES && page.status === 'PENDING'
          ? {
              position: page.position,
              status: 'BUDGET_EXHAUSTED',
              reason: 'PAGE_LIMIT',
            }
          : page,
    );
  const failed = pages.some(
    (page) => !['COMPLETED', 'NO_TEXT', 'PENDING'].includes(page.status),
  );
  const pending =
    !failed &&
    deliveries < OCR_MAX_DELIVERIES &&
    pages.some((page) => page.status === 'PENDING');
  const successful = new Set(previous.quality?.ocr_units ?? []);
  for (const position of current.quality?.ocr_units ?? []) {
    if (
      attemptedSet.has(position) &&
      reported.get(position)?.status === 'COMPLETED'
    )
      successful.add(position);
  }
  const oldSpans = new Map(
    previous.spans
      .filter((span) => span.kind === base && successful.has(span.position))
      .map((span) => [span.position, span]),
  );
  const justAdded = new Set(
    (current.quality?.ocr_units ?? []).filter(
      (position) =>
        attemptedSet.has(position) &&
        reported.get(position)?.status === 'COMPLETED',
    ),
  );
  const spans = current.spans.map((span) =>
    span.kind === base && !justAdded.has(span.position)
      ? (oldSpans.get(span.position) ?? span)
      : span,
  );
  const allPages = new Map(
    (current.quality?.ocr_pages ?? []).map((page) => [page.position, page]),
  );
  for (const page of previous.quality?.ocr_pages ?? [])
    allPages.set(page.position, page);
  for (const page of pages) allPages.set(page.position, page);
  const textUnits = spans.filter(
    (span) => span.kind === base && span.text.trim(),
  ).length;
  const suspected = (current.quality?.ocr_suspected_units ?? []).filter(
    (position) => !successful.has(position),
  );
  const incomplete = pending || failed;
  const status =
    textUnits === 0
      ? 'OCR_REQUIRED'
      : incomplete || suspected.length
        ? 'PARTIAL'
        : 'EXTRACTED';
  const extraction: Extraction = {
    ...current,
    spans,
    status,
    warnings:
      status === 'OCR_REQUIRED'
        ? ['OCR_REQUIRED', 'NO_USABLE_TEXT']
        : status === 'PARTIAL'
          ? ['PARTIAL_EXTRACTION', 'OCR_REQUIRED']
          : current.warnings.filter((warning) => warning === 'EMPTY_UNITS'),
    quality: {
      total_units: current.unit_count,
      text_units: textUnits,
      ocr_suspected_units: suspected,
      blank_units: (current.quality?.blank_units ?? []).filter(
        (position) => !successful.has(position),
      ),
      ocr_candidate_units: [
        ...new Set([
          ...(previous.quality?.ocr_candidate_units ?? []),
          ...(current.quality?.ocr_candidate_units ?? []),
        ]),
      ].sort((a, b) => a - b),
      ocr_units: [...successful].sort((a, b) => a - b),
      ocr_pages: [...allPages.values()].sort((a, b) => a.position - b.position),
    },
  };
  return {
    extraction,
    pending,
    request: {
      ...request,
      pages,
      deliveries,
      status: pending ? 'PENDING' : failed ? 'INCOMPLETE' : 'COMPLETED',
    },
  };
}
