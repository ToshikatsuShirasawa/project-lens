-- Drop bot-token based connection references from the initial uncommitted Slack implementation.
ALTER TABLE "slack_messages" DROP CONSTRAINT IF EXISTS "slack_messages_connectionId_fkey";
ALTER TABLE "slack_imports" DROP CONSTRAINT IF EXISTS "slack_imports_connectionId_fkey";
ALTER TABLE "slack_connections" DROP CONSTRAINT IF EXISTS "slack_connections_organizationId_fkey";
ALTER TABLE "slack_connections" DROP CONSTRAINT IF EXISTS "slack_connections_installedByUserId_fkey";

DROP INDEX IF EXISTS "slack_messages_connectionId_channelId_messageTs_key";
DROP INDEX IF EXISTS "slack_imports_connectionId_channelId_idx";
DROP INDEX IF EXISTS "slack_connections_organizationId_teamId_key";
DROP INDEX IF EXISTS "slack_connections_organizationId_idx";

DROP TABLE IF EXISTS "slack_connections";

-- User-token based Slack account connections.
CREATE TABLE "slack_user_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "slackUserId" TEXT NOT NULL,
    "slackUserName" TEXT,
    "userTokenEncrypted" TEXT NOT NULL,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_user_connections_pkey" PRIMARY KEY ("id")
);

-- Keep existing import/message rows only if this migration is applied over a non-empty local dev DB.
-- The previous Bot-token prototype was never committed, so preserving those rows is not required.
TRUNCATE TABLE "slack_messages", "slack_imports";

ALTER TABLE "slack_imports" DROP COLUMN "connectionId";
ALTER TABLE "slack_imports" ADD COLUMN "userConnectionId" TEXT NOT NULL;
ALTER TABLE "slack_imports" ADD COLUMN "channelType" TEXT NOT NULL DEFAULT 'public_channel';

ALTER TABLE "slack_messages" DROP COLUMN "connectionId";
ALTER TABLE "slack_messages" ADD COLUMN "userConnectionId" TEXT NOT NULL;
ALTER TABLE "slack_messages" ADD COLUMN "channelType" TEXT NOT NULL DEFAULT 'public_channel';

CREATE UNIQUE INDEX "slack_user_connections_userId_teamId_key" ON "slack_user_connections"("userId", "teamId");
CREATE INDEX "slack_user_connections_organizationId_idx" ON "slack_user_connections"("organizationId");
CREATE INDEX "slack_user_connections_slackUserId_idx" ON "slack_user_connections"("slackUserId");
CREATE INDEX "slack_imports_userConnectionId_channelId_idx" ON "slack_imports"("userConnectionId", "channelId");
CREATE UNIQUE INDEX "slack_messages_userConnectionId_channelId_messageTs_key" ON "slack_messages"("userConnectionId", "channelId", "messageTs");

ALTER TABLE "slack_user_connections" ADD CONSTRAINT "slack_user_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "slack_user_connections" ADD CONSTRAINT "slack_user_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "slack_imports" ADD CONSTRAINT "slack_imports_userConnectionId_fkey" FOREIGN KEY ("userConnectionId") REFERENCES "slack_user_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "slack_messages" ADD CONSTRAINT "slack_messages_userConnectionId_fkey" FOREIGN KEY ("userConnectionId") REFERENCES "slack_user_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
