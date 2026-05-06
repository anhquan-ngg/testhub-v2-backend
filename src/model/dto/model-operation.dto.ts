import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class ModelOperationDto {
  @ApiPropertyOptional({ type: Object, description: 'Prisma operation args' })
  @IsOptional()
  @IsObject()
  args?: Record<string, unknown>;
}
