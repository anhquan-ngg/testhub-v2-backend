import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryUserDto } from './dto/query-user.dto';
import { UsersRepository } from './users.repository';

describe('User list ordering', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  it.each(['asc', 'desc'] as const)(
    'validates %s and orders before taking the requested page',
    async (sortOrder) => {
      const query = (await pipe.transform(
        { sortOrder, page: 2, limit: 10 },
        { type: 'query', metatype: QueryUserDto },
      )) as QueryUserDto;
      const user = {
        findMany: jest.fn().mockResolvedValue([{ id: 'fixture' }]),
        count: jest.fn().mockResolvedValue(21),
      };
      const repository = new UsersRepository({
        user,
      } as unknown as PrismaService);
      const result = await repository.findMany(query);
      expect(user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          orderBy: [{ created_at: sortOrder }, { id: sortOrder }],
        }),
      );
      expect(result).toMatchObject({ total: 21, page: 2, limit: 10 });
    },
  );
  it('defaults to newest and rejects arbitrary order values', async () => {
    const query = (await pipe.transform(
      {},
      { type: 'query', metatype: QueryUserDto },
    )) as QueryUserDto;
    expect(query.sortOrder).toBe('desc');
    await expect(
      pipe.transform(
        { sortOrder: 'random' },
        { type: 'query', metatype: QueryUserDto },
      ),
    ).rejects.toThrow();
  });
});
