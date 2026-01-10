import { PrismaClient } from '../generated/prisma-client';
import { enhance } from '@zenstackhq/runtime';

const prisma = new PrismaClient();
const db = enhance(prisma);

async function main() {
  const admin = await db.user.create({
    data: {
      full_name: 'Nguyễn Anh Quân',
      email: 'nanhquan143@gmail.com',
      password: '123456',
      role: 'ADMIN',
    },
  });

  console.log('User created:', admin);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.log(e);
    await prisma.$disconnect();
    process.exit(1);
  });
