import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Getting definition of "update_exam_status"...');
  try {
    const result = await prisma.$queryRaw`
      SELECT pg_get_functiondef('update_exam_status'::regproc);
    `;
    const def = (result as any)[0].pg_get_functiondef;
    const fs = require('fs');
    fs.writeFileSync('function_def.txt', def);
    console.log('Function definition saved to function_def.txt');
  } catch (e) {
    console.error('Error getting function definition:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
