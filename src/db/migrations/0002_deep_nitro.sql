ALTER TABLE "userops" ALTER COLUMN "nonce" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "userops" ALTER COLUMN "call_gas_limit" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "userops" ALTER COLUMN "verification_gas_limit" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "userops" ALTER COLUMN "pre_verification_gas" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "userops" ALTER COLUMN "max_fee_per_gas" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "userops" ALTER COLUMN "max_priority_fee_per_gas" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "userops" ALTER COLUMN "paymaster_verification_gas_limit" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "userops" ALTER COLUMN "paymaster_post_op_gas_limit" SET DATA TYPE numeric;