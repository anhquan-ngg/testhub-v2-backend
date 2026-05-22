import { Module } from '@nestjs/common';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { ChaptersRepository } from './chapters.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChaptersController],
  providers: [ChaptersService, ChaptersRepository],
  exports: [ChaptersService, ChaptersRepository],
})
export class ChaptersModule {}
