import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { ModelOperationDto } from './dto/model-operation.dto';

const ALLOWED_ACTIONS = new Set([
  'findMany',
  'findUnique',
  'findFirst',
  'count',
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

function toPrismaModelName(modelName: string): string {
  if (!modelName) {
    return modelName;
  }

  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

@ApiTags('Model')
@Controller('model')
export class ModelController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':model/:action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a Prisma operation on a model' })
  @ApiResponse({ status: 200, description: 'Prisma operation result.' })
  async executeOperation(
    @Param('model') model: string,
    @Param('action') action: string,
    @Body() body: ModelOperationDto,
  ) {
    if (!ALLOWED_ACTIONS.has(action)) {
      throw new BadRequestException(`Unsupported action: ${action}`);
    }

    const prismaModelName = toPrismaModelName(model);
    const client = this.prisma as unknown as Record<string, unknown>;
    const modelClient = client[prismaModelName] as
      | Record<string, (args?: Record<string, unknown>) => Promise<unknown>>
      | undefined;

    if (!modelClient) {
      throw new NotFoundException(`Unknown model: ${model}`);
    }

    const operation = modelClient[action];

    if (typeof operation !== 'function') {
      throw new BadRequestException(
        `Action ${action} is not supported for ${model}`,
      );
    }

    return operation.call(modelClient, body.args ?? {});
  }
}