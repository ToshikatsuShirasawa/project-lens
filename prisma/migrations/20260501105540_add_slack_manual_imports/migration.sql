-- CreateEnum
CREATE TYPE "SlackImportRangePreset" AS ENUM ('LAST_24_HOURS', 'LAST_3_DAYS', 'LAST_7_DAYS');

-- CreateEnum
CREATE TYPE "SlackImportStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "slack_connections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "botUserId" TEXT,
    "botTokenEncrypted" TEXT NOT NULL,
    "installedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_imports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "rangePreset" "SlackImportRangePreset" NOT NULL,
    "oldestTs" TEXT NOT NULL,
    "latestTs" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SlackImportStatus" NOT NULL DEFAULT 'RUNNING',
    "errorMessage" TEXT,
    "projectInputId" TEXT,
    "importedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_messages" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "messageTs" TEXT NOT NULL,
    "threadTs" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "text" TEXT NOT NULL,
    "permalink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slack_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slack_connections_organizationId_idx" ON "slack_connections"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "slack_connections_organizationId_teamId_key" ON "slack_connections"("organizationId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "slack_imports_projectInputId_key" ON "slack_imports"("projectInputId");

-- CreateIndex
CREATE INDEX "slack_imports_projectId_createdAt_idx" ON "slack_imports"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "slack_imports_connectionId_channelId_idx" ON "slack_imports"("connectionId", "channelId");

-- CreateIndex
CREATE INDEX "slack_messages_projectId_channelId_messageTs_idx" ON "slack_messages"("projectId", "channelId", "messageTs");

-- CreateIndex
CREATE INDEX "slack_messages_importId_idx" ON "slack_messages"("importId");

-- CreateIndex
CREATE UNIQUE INDEX "slack_messages_connectionId_channelId_messageTs_key" ON "slack_messages"("connectionId", "channelId", "messageTs");

-- AddForeignKey
ALTER TABLE "slack_connections" ADD CONSTRAINT "slack_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_connections" ADD CONSTRAINT "slack_connections_installedByUserId_fkey" FOREIGN KEY ("installedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_imports" ADD CONSTRAINT "slack_imports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_imports" ADD CONSTRAINT "slack_imports_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "slack_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_imports" ADD CONSTRAINT "slack_imports_projectInputId_fkey" FOREIGN KEY ("projectInputId") REFERENCES "project_inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_imports" ADD CONSTRAINT "slack_imports_importedByUserId_fkey" FOREIGN KEY ("importedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_messages" ADD CONSTRAINT "slack_messages_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "slack_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_messages" ADD CONSTRAINT "slack_messages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_messages" ADD CONSTRAINT "slack_messages_importId_fkey" FOREIGN KEY ("importId") REFERENCES "slack_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
