import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    try {
      return await this.usersRepository.create(dto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  async findAll(query: QueryUserDto) {
    return this.usersRepository.findMany(query);
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.email !== undefined) {
      throw new BadRequestException('Email cannot be updated');
    }

    await this.findOne(id);
    return this.usersRepository.update(id, dto);
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.usersRepository.deactivate(id);
    return { message: 'User deactivated successfully' };
  }
}
