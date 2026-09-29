import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrintExamDto } from './dto/print-exam.dto';
import { ExamPrintService } from './exam-print.service';

type AuthenticatedRequest = Request & {
  user: { id: string; role: UserRole };
};

@ApiTags('Exams')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.LECTURER, UserRole.ADMIN)
@Controller('exams')
export class ExamPrintController {
  constructor(private readonly service: ExamPrintService) {}

  /** Generates printable exam variants plus an answer key, as a ZIP. */
  @Post(':id/print')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Generate N shuffled exam variants (PDF) and an answer key, zipped, for offline exams',
  })
  @ApiProduces('application/zip')
  @ApiResponse({
    status: 200,
    description: 'ZIP archive of the variants and answer key.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid variant count or not enough questions.',
  })
  @ApiResponse({ status: 403, description: 'Not the owner of this exam.' })
  @ApiResponse({ status: 404, description: 'Exam not found.' })
  async print(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrintExamDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.service.generateArchive(
      id,
      dto.variant_count,
      req.user,
    );
    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="${fileName}"`,
      length: buffer.length,
    });
  }
}
