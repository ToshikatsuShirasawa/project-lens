-- Extend Slack manual import presets for first-time backfill.
ALTER TYPE "SlackImportRangePreset" ADD VALUE IF NOT EXISTS 'LAST_14_DAYS';
ALTER TYPE "SlackImportRangePreset" ADD VALUE IF NOT EXISTS 'LAST_30_DAYS';
