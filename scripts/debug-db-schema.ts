import { PrismaClient } from '../generated/prisma-client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Inspecting database schema for exams table...');

  try {
    // 1. Check Enum labels
    console.log('\n--- Checking Enum Labels for "ExamStatus" ---');
    const enumLabels = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'ExamStatus'
    `;
    console.log('Current Enum Values:', enumLabels);

    // 2. Check Column Default Value
    console.log('\n--- Checking Column Default Value ---');
    const columnInfo: any[] = await prisma.$queryRaw`
      SELECT column_name, column_default, data_type
      FROM information_schema.columns
      WHERE table_name = 'exams' AND column_name = 'status'
    `;

    if (columnInfo.length > 0) {
      console.log('Column Info:', columnInfo[0]);
    } else {
      console.log('⚠️ Could not find column "status" in table "exams".');
    }
  } catch (error) {
    console.error('❌ Error inspecting DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
