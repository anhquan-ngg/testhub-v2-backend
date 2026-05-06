/*
  Warnings:

  - You are about to drop the column `access_token_encrypted` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `access_token_iv` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token_encrypted` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token_iv` on the `accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "access_token_encrypted",
DROP COLUMN "access_token_iv",
DROP COLUMN "refresh_token_encrypted",
DROP COLUMN "refresh_token_iv";
