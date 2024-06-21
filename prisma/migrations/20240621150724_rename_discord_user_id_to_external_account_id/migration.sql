/*
  Warnings:

  - You are about to drop the column `discord_user_id` on the `Content` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Content" DROP COLUMN "discord_user_id",
ADD COLUMN     "external_account_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "external_account_platform" TEXT NOT NULL DEFAULT '';
