import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateChapterDto } from './create-chapter.dto';

export class UpdateChapterDto extends PartialType(
  OmitType(CreateChapterDto, ['parent_id'] as const),
) {
  @ApiPropertyOptional({
    nullable: true,
    example: 'uuid-of-parent-chapter',
    description:
      'New parent chapter. Omit to keep the current parent; send null to make the chapter a root chapter.',
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string | null;
}
