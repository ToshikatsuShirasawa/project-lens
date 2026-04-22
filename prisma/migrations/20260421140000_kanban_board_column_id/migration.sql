-- AlterTable
ALTER TABLE "kanban_tasks" ADD COLUMN "boardColumnId" TEXT NOT NULL DEFAULT 'backlog';

-- 既存行: DB の列 enum から UI 列を復元（IN_PROGRESS は従来どおり inprogress）
UPDATE "kanban_tasks" SET "boardColumnId" = CASE "column"::text
  WHEN 'BACKLOG' THEN 'backlog'
  WHEN 'IN_PROGRESS' THEN 'inprogress'
  WHEN 'DONE' THEN 'done'
  ELSE 'backlog'
END;

-- CreateIndex
CREATE INDEX "kanban_tasks_projectId_boardColumnId_sortOrder_idx" ON "kanban_tasks"("projectId", "boardColumnId", "sortOrder");
