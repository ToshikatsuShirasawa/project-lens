-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "projectLimit" INTEGER;

-- 既存行は制限なし（null = 無制限）。有料化プラン導入時に値を入れられる
