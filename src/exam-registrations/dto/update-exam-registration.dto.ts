import { PartialType } from '@nestjs/swagger';
import { CreateExamRegistrationDto } from './create-exam-registration.dto';

export class UpdateExamRegistrationDto extends PartialType(
  CreateExamRegistrationDto,
) {}
