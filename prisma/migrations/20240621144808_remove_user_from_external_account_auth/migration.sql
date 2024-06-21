/*
  Warnings:

  - You are about to drop the column `user_id` on the `ExternalAccountAuth` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExternalAccountAuth" DROP CONSTRAINT "ExternalAccountAuth_user_id_fkey";

-- AlterTable
ALTER TABLE "ExternalAccountAuth" DROP COLUMN "user_id";
