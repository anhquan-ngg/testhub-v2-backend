import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // clean up
  await prisma.user.deleteMany();

  // const john = await prisma.user.create({
  //   data: {
  //     email: 'john@testhub.dev',
  //     fullName: 'John Doe',
  //     password: '123456',
  //   },
  // });

  // console.log('User created:', john);
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
