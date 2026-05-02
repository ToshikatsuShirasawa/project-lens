-- Extend Slack manual import presets for older first-time backfill.
ALTER TYPE "SlackImportRangePreset" ADD VALUE IF NOT EXISTS 'LAST_60_DAYS';
ALTER TYPE "SlackImportRangePreset" ADD VALUE IF NOT EXISTS 'LAST_90_DAYS';
