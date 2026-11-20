import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { ExamAnalyticsService } from './exam-analytics.service';
import { ExamAnalyticsDto } from './dto/exam-analytics.dto';

@ApiTags('Exam Analytics')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.LECTURER)
@Controller('exams')
export class ExamAnalyticsController {
  constructor(private readonly analyticsService: ExamAnalyticsService) {}

  @Get(':examId/analytics')
  @ApiOperation({
    summary:
      'Question difficulty/discrimination and exam score statistics (quality dashboard)',
  })
  @ApiResponse({ status: 200, type: ExamAnalyticsDto })
  @ApiResponse({ status: 403, description: 'Not the exam owner.' })
  @ApiResponse({ status: 404, description: 'Exam not found.' })
  getExamAnalytics(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Req() req: { user: { id: string; role: UserRole } },
  ): Promise<ExamAnalyticsDto> {
    return this.analyticsService.getExamAnalytics(examId, req.user);
  }
}
