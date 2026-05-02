-- Enforce one Slack user connection per ProjectLens user and organization.
-- This removes the need for "latest connection" selection and prevents using
-- another organization-scoped Slack connection as a fallback.
DROP INDEX IF EXISTS "slack_user_connections_userId_teamId_key";
CREATE UNIQUE INDEX "slack_user_connections_userId_organizationId_key" ON "slack_user_connections"("userId", "organizationId");
