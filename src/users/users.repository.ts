import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly select = {
    id: true,
    created_at: true,
    updated_at: true,
    full_name: true,
    email: true,
    role: true,
    status: true,
    school: true,
    phone: true,
    address: true,
    password: false,
  } satisfies Prisma.UserSelect;

  async create(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: dto,
      select: this.select,
    });
  }

  async findMany(query: QueryUserDto) {
    const { page = 1, limit = 10, search, role, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: this.select,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.select,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.select,
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
