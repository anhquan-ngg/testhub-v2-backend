import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for triggers on table "exams"...');
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        trigger_name, 
        event_manipulation, 
        event_object_table, 
        action_statement 
      FROM information_schema.triggers 
      WHERE event_object_table = 'exams'
    `;
    console.log('Triggers found:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error querying triggers:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
