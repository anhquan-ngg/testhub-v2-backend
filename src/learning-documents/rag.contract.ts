import type { Prisma } from '@prisma/client';
import { z } from 'zod';

export const RAG_QUEUE = 'ai-document-indexing';
export const RAG_JOB = 'index-step';
export const RAG_LEASE_MS = 120_000;
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const ragProfileSchema = z
  .object({
    profile_id: hash,
    config: z.record(z.union([z.string(), z.number().int()])),
  })
  .strict();
export type RagProfile = z.infer<typeof ragProfileSchema>;
export const ragProgressSchema = z
  .object({
    index_id: z.string().uuid(),
    profile_id: hash,
    status: z.enum(['BUILDING', 'READY', 'REVOKED']),
    chunk_count: z.number().int().min(1).max(5000),
    completed_chunks: z.number().int().min(0).max(5000),
  })
  .strict()
  .refine(
    (v) =>
      v.completed_chunks <= v.chunk_count &&
      (v.status !== 'READY' || v.completed_chunks === v.chunk_count),
  );
export type RagProgress = z.infer<typeof ragProgressSchema>;
export type RagCommand = {
  index_id: string;
  profile_id: string;
  scope: {
    owner_id: string;
    topic_id: string;
    chapter_id: string;
    document_id: string;
    version_id: string;
  };
};
export const retrieveCommandSchema = z
  .object({
    version_ids: z
      .array(z.string().uuid())
      .min(1)
      .max(10)
      .refine((v) => new Set(v).size === v.length),
    query: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .refine((v) => Buffer.byteLength(v, 'utf8') <= 1800),
    top_k: z.number().int().min(1).max(8).default(6),
  })
  .strict();
export const retrievedChunkSchema = z
  .object({
    chunk_id: z.string().uuid(),
    ordinal: z.number().int().min(0).max(4999),
    kind: z.enum(['PAGE', 'SLIDE', 'NOTES']),
    position: z.number().int().min(1).max(500),
    start_offset: z.number().int().min(0),
    end_offset: z.number().int().min(1),
    text: z
      .string()
      .min(1)
      .refine((v) => Buffer.byteLength(v, 'utf8') <= 1800),
    text_sha256: hash,
    index_id: z.string().uuid(),
    document_id: z.string().uuid(),
    version_id: z.string().uuid(),
    source_sha256: hash,
    similarity: z.number().finite().min(-1.000001).max(1.000001),
  })
  .strict()
  .refine(
    (v) =>
      v.end_offset > v.start_offset &&
      Array.from(v.text).length === v.end_offset - v.start_offset,
  );
export const retrieveResponseSchema = z
  .object({
    profile_id: hash,
    quality_status: z.literal('UNASSESSED'),
    context_bytes: z.number().int().min(1).max(12000),
    chunks: z.array(retrievedChunkSchema).min(1).max(8),
  })
  .strict()
  .refine(
    (v) =>
      v.chunks.reduce((n, c) => n + Buffer.byteLength(c.text, 'utf8'), 0) ===
      v.context_bytes,
  );

export const indexSelect = {
  id: true,
  profile_id: true,
  status: true,
  chunk_count: true,
  completed_chunks: true,
  error_code: true,
  created_at: true,
} satisfies Prisma.LearningDocumentIndexSelect;
