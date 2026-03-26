-- AlterTable: add per-workspace reasoning effort preference
ALTER TABLE "workspaces" ADD COLUMN "chatReasoningEffort" TEXT;
