import { RagAccessModule } from './rag-access.module';
import { RagController } from './rag.controller';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { DocumentService } from './document.service';
import { DocumentClient } from './document-client.service';
import { DocumentController } from './document.controller';

/** Business HTTP resources, imported by API and the dedicated document worker. */
@Module({
  imports: [ConfigModule, PrismaModule, S3Module, RagAccessModule],
  controllers: [DocumentController, RagController],
  providers: [DocumentService, DocumentClient],
  exports: [RagAccessModule, DocumentClient, S3Module],
})
export class DocumentModule {}
