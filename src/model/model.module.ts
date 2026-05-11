import { Module } from '@nestjs/common';
import { ModelController } from './model.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ModelController],
})
export class ModelModule {}
