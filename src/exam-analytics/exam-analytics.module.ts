import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ExamAnalyticsController } from './exam-analytics.controller';
import { ExamAnalyticsService } from './exam-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExamAnalyticsController],
  providers: [ExamAnalyticsService],
})
export class ExamAnalyticsModule {}
