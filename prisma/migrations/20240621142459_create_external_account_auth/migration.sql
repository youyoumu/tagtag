-- CreateTable
CREATE TABLE "ExternalAccountAuth" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalAccountAuth_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExternalAccountAuth" ADD CONSTRAINT "ExternalAccountAuth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
