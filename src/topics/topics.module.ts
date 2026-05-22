import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { TopicsRepository } from './topics.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TopicsController],
  providers: [TopicsService, TopicsRepository],
  exports: [TopicsService, TopicsRepository],
})
export class TopicsModule {}
