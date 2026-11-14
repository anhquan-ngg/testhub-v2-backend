import { z } from 'zod';

export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_RESULT_MAX_BYTES = 8 * 1024 * 1024;
export const DOCUMENT_QUEUE = 'ai-document-processing';
export const DOCUMENT_JOB = 'extract';
export const DOCUMENT_LEASE_MS = 120_000;
/** Parser rule generation; extractions from older rules are never reused. */
export const DOCUMENT_PARSER_RULES = 'text/v2';

/** True when a stored parser version was produced by the current rule set. */
export function isCurrentParser(parserVersion: string): boolean {
  return parserVersion.endsWith(`;${DOCUMENT_PARSER_RULES}`);
}

/**
 * A source may feed RAG/plans/generation when fully extracted, or when a
 * PARTIAL extraction was explicitly confirmed by the owner.
 */
export function isUsableSource(
  status: string,
  partialConfirmedAt: Date | null | undefined,
): boolean {
  return (
    status === 'EXTRACTED' || (status === 'PARTIAL' && !!partialConfirmedAt)
  );
}

function positiveEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** Per-lecturer library limits; evaluated per call so deployments can tune them by env. */
export function documentQuota() {
  return {
    maxDocuments: positiveEnv('DOCUMENT_MAX_ACTIVE_PER_OWNER', 100),
    maxBytes: positiveEnv(
      'DOCUMENT_MAX_TOTAL_BYTES_PER_OWNER',
      500 * 1024 * 1024,
    ),
  };
}

/** Age after an upload reservation expires before staging objects are reclaimed. */
export function uploadAbandonGraceMs() {
  return positiveEnv('DOCUMENT_UPLOAD_ABANDON_GRACE_MS', 24 * 3600_000);
}

export const renameDocumentSchema = z
  .object({ title: z.string().trim().min(1).max(200) })
  .strict();

export const listDocumentsQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    archived: z.enum(['true', 'false', 'all']).default('false'),
  })
  .strict();
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
/** Client-computed digest used only as a pre-upload hint; the server re-hashes at completion. */
export const checkDuplicateSchema = z
  .object({
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    source_type: z.enum(['PDF', 'PPTX']),
  })
  .strict();
export const DOCUMENT_MIME = {
  PDF: 'application/pdf',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;
export const uploadDocumentSchema = z
  .object({
    file_name: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine(
        (s) =>
          !s.includes('/') &&
          !s.includes('\\') &&
          Array.from(s).every((character) => character.charCodeAt(0) >= 32),
      ),
    source_type: z.enum(['PDF', 'PPTX']),
    mime_type: z.string(),
    size: z.number().int().min(1).max(DOCUMENT_MAX_BYTES),
    include_notes: z.boolean().default(false),
    consent: z.literal(true),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.mime_type !== DOCUMENT_MIME[v.source_type] ||
      !v.file_name.toLowerCase().endsWith(`.${v.source_type.toLowerCase()}`) ||
      (v.source_type === 'PDF' && v.include_notes)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid document type',
      });
  });
export const createDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    topic_id: z.string().uuid(),
    chapter_id: z.string().uuid().nullable().optional().default(null),
    upload: uploadDocumentSchema,
  })
  .strict();

/** Per-unit extraction health; unit numbers are original PDF pages or slides. */
export const extractionQualitySchema = z
  .object({
    total_units: z.number().int().min(1).max(500),
    text_units: z.number().int().min(0).max(500),
    ocr_suspected_units: z.array(z.number().int().min(1).max(500)).max(500),
    blank_units: z.array(z.number().int().min(1).max(500)).max(500),
  })
  .strict();
export type ExtractionQuality = z.infer<typeof extractionQualitySchema>;

export const extractionSchema = z
  .object({
    contract_version: z.literal('document-extraction.v1'),
    source_type: z.enum(['PDF', 'PPTX']),
    source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    parser_version: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9./;:_-]+$/),
    include_notes: z.boolean(),
    status: z.enum(['EXTRACTED', 'PARTIAL', 'OCR_REQUIRED']),
    unit_count: z.number().int().min(1).max(500),
    spans: z
      .array(
        z
          .object({
            kind: z.enum(['PAGE', 'SLIDE', 'NOTES']),
            position: z.number().int().min(1).max(500),
            text: z.string().max(1_000_000),
          })
          .strict(),
      )
      .min(1)
      .max(1000),
    warnings: z
      .array(
        z.enum([
          'EMPTY_UNITS',
          'OCR_REQUIRED',
          'PARTIAL_EXTRACTION',
          'NO_USABLE_TEXT',
        ]),
      )
      .max(4),
    quality: extractionQualitySchema.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const base = v.source_type === 'PDF' ? 'PAGE' : 'SLIDE';
    const units = v.spans
      .filter((s) => s.kind === base)
      .map((s) => s.position)
      .sort((a, b) => a - b);
    if (
      units.length !== v.unit_count ||
      units.some((n, i) => n !== i + 1) ||
      new Set(v.spans.map((s) => `${s.kind}:${s.position}`)).size !==
        v.spans.length ||
      v.spans.some(
        (s) =>
          s.position > v.unit_count ||
          (s.kind !== base &&
            !(
              v.source_type === 'PPTX' &&
              v.include_notes &&
              s.kind === 'NOTES'
            )),
      ) ||
      v.spans.reduce((n, s) => n + Array.from(s.text).length, 0) > 1_000_000 ||
      (v.status !== 'OCR_REQUIRED' && !v.spans.some((s) => s.text.trim())) ||
      (v.status === 'PARTIAL' && !v.quality?.ocr_suspected_units.length) ||
      (v.quality &&
        (v.quality.total_units !== v.unit_count ||
          v.quality.text_units > v.unit_count ||
          [...v.quality.ocr_suspected_units, ...v.quality.blank_units].some(
            (n) => n > v.unit_count,
          )))
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid source manifest',
      });
  });
export type Extraction = z.infer<typeof extractionSchema>;
export type UploadDocument = z.infer<typeof uploadDocumentSchema>;
