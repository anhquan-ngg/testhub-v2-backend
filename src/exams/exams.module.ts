import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { ExamsRepository } from './exams.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExamsController],
  providers: [ExamsService, ExamsRepository],
  exports: [ExamsService, ExamsRepository],
})
export class ExamsModule {}
