import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ExamsModule } from '../exams/exams.module';
import { S3Module } from '../s3/s3.module';
import { DocxQuestionImportParser } from './parsers/docx-question-import.parser';
import { XlsxQuestionImportParser } from './parsers/xlsx-question-import.parser';
import { QUESTION_IMPORT_QUEUE } from './question-import.constants';
import { QuestionImportController } from './question-import.controller';
import { QuestionImportProcessor } from './question-import.processor';
import { QuestionImportQueueService } from './question-import-queue.service';
import { QuestionImportService } from './question-import.service';

@Module({
  imports: [
    S3Module,
    ExamsModule,
    BullModule.registerQueue({ name: QUESTION_IMPORT_QUEUE }),
  ],
  controllers: [QuestionImportController],
  providers: [
    QuestionImportService,
    QuestionImportQueueService,
    QuestionImportProcessor,
    DocxQuestionImportParser,
    XlsxQuestionImportParser,
  ],
})
export class QuestionImportModule {}
