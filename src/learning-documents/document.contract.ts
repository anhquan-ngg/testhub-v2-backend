import { z } from 'zod';

export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_RESULT_MAX_BYTES = 8 * 1024 * 1024;
export const DOCUMENT_QUEUE = 'ai-document-processing';
export const DOCUMENT_JOB = 'extract';
export const DOCUMENT_LEASE_MS = 120_000;
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
    chapter_id: z.string().uuid(),
    upload: uploadDocumentSchema,
  })
  .strict();

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
    status: z.enum(['EXTRACTED', 'OCR_REQUIRED']),
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
    warnings: z.array(z.enum(['EMPTY_UNITS', 'OCR_REQUIRED'])).max(2),
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
      (v.status === 'EXTRACTED' && !v.spans.some((s) => s.text.trim()))
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid source manifest',
      });
  });
export type Extraction = z.infer<typeof extractionSchema>;
export type UploadDocument = z.infer<typeof uploadDocumentSchema>;
