import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Make this module global so that PrismaService can be injected anywhere without importing the module
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
