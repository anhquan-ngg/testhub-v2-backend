import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamRegistrationsController } from './exam-registrations.controller';
import { ExamRegistrationsRepository } from './exam-registrations.repository';
import { ExamRegistrationsService } from './exam-registrations.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExamRegistrationsController],
  providers: [ExamRegistrationsService, ExamRegistrationsRepository],
  exports: [ExamRegistrationsService, ExamRegistrationsRepository],
})
export class ExamRegistrationsModule {}
