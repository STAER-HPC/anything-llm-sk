-- AlterTable: add per-user cost limits
ALTER TABLE "users" ADD COLUMN "daily_cost_limit"   REAL;
ALTER TABLE "users" ADD COLUMN "weekly_cost_limit"  REAL;
ALTER TABLE "users" ADD COLUMN "monthly_cost_limit" REAL;
