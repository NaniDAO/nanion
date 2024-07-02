ALTER TABLE "userops" RENAME COLUMN "time_range_start" TO "valid_after";--> statement-breakpoint
ALTER TABLE "userops" RENAME COLUMN "time_range_end" TO "valid_until";--> statement-breakpoint
ALTER TABLE "userops" ALTER COLUMN "valid_after" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "userops" ALTER COLUMN "valid_until" SET DATA TYPE timestamp;