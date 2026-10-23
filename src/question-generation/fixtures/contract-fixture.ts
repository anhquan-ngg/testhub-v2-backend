import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  aiGenerateRequestSchema,
  aiGenerateResponseSchema,
  textGenerationCommandSchema,
} from '../question-generation.contract';

/** Read the versioned cross-language example through its runtime validators. */
export function readContractFixture() {
  const raw: unknown = JSON.parse(
    readFileSync(join(__dirname, 'text-generation.v1.json'), 'utf8'),
  );
  return z
    .object({
      version: z.literal('text-generation.v1'),
      command: textGenerationCommandSchema,
      internal_request: aiGenerateRequestSchema,
      internal_response: aiGenerateResponseSchema,
    })
    .strict()
    .parse(raw);
}
