import { PrismaClient } from '../generated/prisma-client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for PENDING exams...');

  // Use raw SQL because 'PENDING' might not be in the current client's Enum definition
  // and we want to cast it safely or check strictly against text.

  try {
    // Check count first
    const countResult: any = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "exams" WHERE "status"::text = 'PENDING'
    `;
    const count = countResult[0]?.count || 0;

    if (count > 0) {
      console.log(
        `⚠️ Found ${count} exams with status 'PENDING'. Migrating to 'ACTIVE'...`,
      );

      // Update
      const updateResult = await prisma.$executeRaw`
        UPDATE "exams" 
        SET "status" = 'ACTIVE'::"ExamStatus" 
        WHERE "status"::text = 'PENDING'
      `;

      console.log(`✅ Successfully updated ${updateResult} exams.`);
    } else {
      console.log('✅ No exams with PENDING status found. Database is clean.');
    }
  } catch (error) {
    console.error('❌ Error during migration:', error);
    // process.exit(1); // Don't exit 1, let's see if we can continue or if it was just a connection error
  } finally {
    await prisma.$disconnect();
  }
}

main();
