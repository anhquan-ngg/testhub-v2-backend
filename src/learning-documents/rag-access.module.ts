import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentRepository } from './document.repository';
import { RagRepository } from './rag.repository';
import { RagService } from './rag.service';
import { RagClient } from './rag-client.service';
/** Shared business authorization/index access, with no object-storage dependency. */
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [DocumentRepository, RagRepository, RagService, RagClient],
  exports: [DocumentRepository, RagRepository, RagService, RagClient],
})
export class RagAccessModule {}
