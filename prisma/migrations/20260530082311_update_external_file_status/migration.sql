-- AlterEnum
ALTER TYPE "FileStatus" ADD VALUE 'EXTERNAL';

-- AlterTable
ALTER TABLE "files" ALTER COLUMN "s3_key" DROP NOT NULL;
