import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    return this.usersRepository.create(dto);
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
    await this.findOne(id);
    return this.usersRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.usersRepository.remove(id);
    return { message: 'User deleted successfully' };
  }
}
