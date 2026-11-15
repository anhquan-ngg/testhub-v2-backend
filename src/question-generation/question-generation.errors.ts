import { HttpException, HttpStatus } from '@nestjs/common';
import {
  generationEvidenceDetailsSchema,
  GenerationEvidenceDetails,
} from './generation-evidence.contract';

export type GenerationErrorCode =
  | 'AI_DOCUMENT_SOURCE_INVALID'
  | 'AI_DOCUMENT_OCR_REQUIRED'
  | 'AI_DOCUMENT_PARTIAL_UNCONFIRMED'
  | 'AI_DOCUMENT_FAILED'
  | 'AI_INDEX_FAILED'
  | 'AI_SOURCE_TIMEOUT'
  | 'AI_RAG_DISABLED'
  | 'AI_GENERATION_DISABLED'
  | 'AI_REQUEST_INVALID'
  | 'AI_ROLE_FORBIDDEN'
  | 'AI_TARGET_NOT_FOUND'
  | 'CONSENT_REQUIRED'
  | 'AI_SERVICE_AUTH_FAILED'
  | 'AI_SERVICE_CONTRACT_MISMATCH'
  | 'AI_SERVICE_UNAVAILABLE'
  | 'AI_SERVICE_TIMEOUT'
  | 'AI_SERVICE_FAILED'
  | 'AI_PROVIDER_FAILED'
  | 'AI_OUTPUT_INVALID'
  | 'AI_INSUFFICIENT_EVIDENCE';

/** Safe error boundary: never attach input, upstream body, token or raw cause. */
export class QuestionGenerationException extends HttpException {
  readonly evidenceDetails?: GenerationEvidenceDetails;

  constructor(
    readonly code: GenerationErrorCode,
    status: HttpStatus,
    message: string,
    evidenceDetails?: GenerationEvidenceDetails,
  ) {
    const parsed = generationEvidenceDetailsSchema.safeParse(evidenceDetails);
    const safeDetails =
      code === 'AI_INSUFFICIENT_EVIDENCE' && parsed.success
        ? parsed.data
        : undefined;
    const names: Partial<Record<HttpStatus, string>> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
      [HttpStatus.GATEWAY_TIMEOUT]: 'Gateway Timeout',
    };
    super(
      {
        statusCode: status,
        error: names[status],
        message,
        details: {
          code,
          ...(safeDetails ? { error_details: safeDetails } : {}),
        },
      },
      status,
    );
    this.evidenceDetails = safeDetails;
  }
}
