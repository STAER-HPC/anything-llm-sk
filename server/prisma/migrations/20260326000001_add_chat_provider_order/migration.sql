-- AlterTable: add per-workspace OpenRouter provider pin
ALTER TABLE "workspaces" ADD COLUMN "chatProviderOrder" TEXT;
