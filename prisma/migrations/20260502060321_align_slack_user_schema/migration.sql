-- AlterTable
ALTER TABLE "slack_imports" ALTER COLUMN "channelType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "slack_messages" ALTER COLUMN "channelType" DROP DEFAULT;
