import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  PublishRegradeDto,
  SaveRegradeDraftDto,
} from './dto/regrade-submission.dto';
import { SubmissionRegradeService } from './submission-regrade.service';

type LecturerRequest = { user: { id: string } };

@ApiTags('Submission regrading')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.LECTURER)
@Controller('submission/:id/regrade')
export class SubmissionRegradeController {
  constructor(private readonly regrading: SubmissionRegradeService) {}

  @Get()
  @ApiOperation({
    summary:
      'Read an owned completed submission, private draft and publication history',
  })
  @ApiResponse({
    status: 200,
    description: 'Regrading workspace; scores are normalized 0..1.',
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not owned or not found.',
  })
  get(@Param('id', ParseUUIDPipe) id: string, @Req() req: LecturerRequest) {
    return this.regrading.getWorkspace(id, req.user.id);
  }

  @Put('draft')
  @ApiOperation({
    summary:
      'Save a private regrading draft without changing published results',
  })
  @ApiResponse({
    status: 200,
    description: 'Saved workspace with an incremented draft revision.',
  })
  @ApiResponse({
    status: 409,
    description: 'Draft or published grades changed; reload before editing.',
  })
  save(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: LecturerRequest,
    @Body() dto: SaveRegradeDraftDto,
  ) {
    return this.regrading.saveDraft(id, req.user.id, dto);
  }

  @Post('publish')
  @ApiOperation({
    summary:
      'Publish a saved draft and notify the student; replay-safe by revision',
  })
  @ApiResponse({
    status: 201,
    description: 'Published workspace, or the current workspace on replay.',
  })
  @ApiResponse({
    status: 409,
    description: 'Draft is stale or has not been saved.',
  })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: LecturerRequest,
    @Body() dto: PublishRegradeDto,
  ) {
    return this.regrading.publish(id, req.user.id, dto);
  }
}
