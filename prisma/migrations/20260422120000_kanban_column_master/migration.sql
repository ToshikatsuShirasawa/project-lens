-- プロジェクトごとのカンバン列マスタ
CREATE TABLE "project_kanban_columns" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "colorKey" TEXT,
    "columnType" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_kanban_columns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_kanban_columns_projectId_key_key" ON "project_kanban_columns"("projectId", "key");

CREATE INDEX "project_kanban_columns_projectId_sortOrder_idx" ON "project_kanban_columns"("projectId", "sortOrder");

ALTER TABLE "project_kanban_columns" ADD CONSTRAINT "project_kanban_columns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 既存プロジェクトごとに既定 5 列を作成
INSERT INTO "project_kanban_columns" ("id", "projectId", "key", "name", "sortOrder", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    p."id",
    v.key,
    v.name,
    v.sort_order,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "projects" p
CROSS JOIN (
    VALUES
        ('backlog', 'バックログ', 0),
        ('inprogress', '進行中', 1),
        ('blocked', 'ブロック', 2),
        ('review', 'レビュー', 3),
        ('done', '完了', 4)
) AS v(key, name, sort_order);

-- タスクに列参照を追加（旧 column / boardColumnId から割当）
ALTER TABLE "kanban_tasks" ADD COLUMN "columnId" TEXT;

UPDATE "kanban_tasks" kt
SET "columnId" = pkc."id"
FROM "project_kanban_columns" pkc
WHERE pkc."projectId" = kt."projectId"
  AND pkc."key" = (
    CASE
      WHEN kt."boardColumnId" IN ('backlog', 'inprogress', 'blocked', 'review', 'done') THEN kt."boardColumnId"
      WHEN kt."column"::text = 'BACKLOG' THEN 'backlog'
      WHEN kt."column"::text = 'IN_PROGRESS' THEN 'inprogress'
      WHEN kt."column"::text = 'DONE' THEN 'done'
      ELSE 'backlog'
    END
  );

-- boardColumnId が無効だった行などのフォールバック
UPDATE "kanban_tasks" kt
SET "columnId" = (
    SELECT pkc."id"
    FROM "project_kanban_columns" pkc
    WHERE pkc."projectId" = kt."projectId" AND pkc."key" = 'backlog'
    LIMIT 1
)
WHERE kt."columnId" IS NULL;

ALTER TABLE "kanban_tasks" ALTER COLUMN "columnId" SET NOT NULL;

DROP INDEX IF EXISTS "kanban_tasks_projectId_column_sortOrder_idx";
DROP INDEX IF EXISTS "kanban_tasks_projectId_boardColumnId_sortOrder_idx";

ALTER TABLE "kanban_tasks" DROP COLUMN "boardColumnId";
ALTER TABLE "kanban_tasks" DROP COLUMN "column";

ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "project_kanban_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "kanban_tasks_projectId_columnId_sortOrder_idx" ON "kanban_tasks"("projectId", "columnId", "sortOrder");

DROP TYPE "KanbanColumn";
