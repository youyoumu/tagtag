-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discord_user_id" TEXT[] DEFAULT ARRAY[]::TEXT[];
