-- CreateEnum
CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_userId_idx" ON "organization_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 既存 projects に紐づく前: nullable
ALTER TABLE "projects" ADD COLUMN "organizationId" TEXT;

-- 1 org に既存行を集約（Phase 1 移行。後から org 分割は別タスク）
INSERT INTO "organizations" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES (
    'cphase1migratedefaultorg0',
    'マイグレーションワークスペース',
    NULL,
    NOW(),
    NOW()
);

UPDATE "projects"
SET "organizationId" = 'cphase1migratedefaultorg0'
WHERE "organizationId" IS NULL;

-- project_members に出てくるユーザーを org に取り込み（最優先ロールを付与）
INSERT INTO "organization_members" ("id", "role", "createdAt", "organizationId", "userId")
SELECT
    'cphase1m_' || replace(gen_random_uuid()::text, '-', ''),
    (CASE
        WHEN BOOL_OR(pm."role"::text = 'OWNER') THEN 'OWNER'::"OrganizationMemberRole"
        WHEN BOOL_OR(pm."role"::text = 'ADMIN') THEN 'ADMIN'::"OrganizationMemberRole"
        ELSE 'MEMBER'::"OrganizationMemberRole"
    END),
    NOW(),
    'cphase1migratedefaultorg0',
    pm."userId"
FROM "project_members" pm
GROUP BY pm."userId";

-- users にのみ存在（PJ メンバーにいない）行は従来どおり org に含めない

ALTER TABLE "projects" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
