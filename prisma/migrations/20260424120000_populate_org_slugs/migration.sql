-- Backfill slug for existing organizations that have none.
-- Uses the first 12 chars of the cuid id, which is collision-resistant
-- given the cuid alphabet and the typical small number of organizations.
UPDATE "organizations"
SET "slug" = LEFT("id", 12)
WHERE "slug" IS NULL;
