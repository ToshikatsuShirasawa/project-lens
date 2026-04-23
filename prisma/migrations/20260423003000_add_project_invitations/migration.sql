-- CreateEnum
CREATE TYPE "ProjectInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "project_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "ProjectInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,

    CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_invitations_token_key" ON "project_invitations"("token");

-- CreateIndex
CREATE INDEX "project_invitations_projectId_status_idx" ON "project_invitations"("projectId", "status");

-- CreateIndex
CREATE INDEX "project_invitations_projectId_email_idx" ON "project_invitations"("projectId", "email");

-- CreateIndex
CREATE INDEX "project_invitations_email_idx" ON "project_invitations"("email");

-- CreateIndex
CREATE INDEX "project_invitations_organizationId_idx" ON "project_invitations"("organizationId");

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
