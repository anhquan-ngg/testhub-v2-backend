import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(
    'Dropping trigger "exam_status_trigger" and function "update_exam_status"...',
  );
  try {
    // Drop the trigger first
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS exam_status_trigger ON exams;`,
    );
    console.log('Trigger dropped.');

    // Drop the function
    await prisma.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS update_exam_status();`,
    );
    console.log('Function dropped.');
  } catch (e) {
    console.error('Error dropping trigger/function:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
