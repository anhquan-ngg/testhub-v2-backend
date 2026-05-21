import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import type { Request } from 'express';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private isAdmin(req: Request): boolean {
    return req.user?.role === 'ADMIN';
  }

  private assertAdmin(req: Request): void {
    if (!this.isAdmin(req)) {
      throw new ForbiddenException('Only admins can access this resource');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  create(@Body() dto: CreateUserDto, @Req() req: Request) {
    this.assertAdmin(req);
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated user list.' })
  findAll(@Query() query: QueryUserDto, @Req() req: Request) {
    this.assertAdmin(req);
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'Returns the user.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    this.assertAdmin(req);
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const isAdmin = this.isAdmin(req);
    const isSelf = req.user?.id === id;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException(
        'Only admins or the user can update this user',
      );
    }

    if (!isAdmin && dto.role !== undefined) {
      throw new ForbiddenException('Only admins can update user role');
    }

    if (!isAdmin && dto.status !== undefined) {
      throw new ForbiddenException('Only admins can update user status');
    }

    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  deactivate(@Param('id') id: string, @Req() req: Request) {
    this.assertAdmin(req);
    return this.usersService.deactivate(id);
  }
}
