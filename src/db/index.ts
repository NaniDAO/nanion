import { type UserOperation, ChainId } from "./../types";
import { DateTime } from "luxon";
import { simulateUserOp } from "./../userop-utils";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { Pool } from "pg";
import dotenv from "dotenv";
import { getUserOperationHash } from "permissionless";
import type { EntryPoint } from "permissionless/types";
import { userops } from "./schema";
import fs from "fs";
import path from "path";
import { getKeyFromNonce } from "eip-7582-utils";
import type { Address } from "viem";
import { arbitrum } from "viem/chains";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    ca: fs
      .readFileSync(path.join(__dirname, "..", "..", "ca-certificate.crt"))
      .toString(),
  },
});

const db = drizzle(pool);

export async function saveUserOpToDb(
  userop: UserOperation,
  entryPoint: string,
  chainId: ChainId,
  timeRange: [DateTime, DateTime],
): Promise<{ message: string; hash: string }> {
  // if (await simulateUserOp(userop, chainId)) {
  try {
    const userOpHash = getUserOperationHash({
      userOperation: userop,
      entryPoint: entryPoint as EntryPoint,
      chainId,
    });

    await db.insert(userops).values({
      userophash: userOpHash,
      sender: userop.sender.toLowerCase(),
      key: getKeyFromNonce(userop.nonce),
      nonce: BigInt(userop.nonce),
      factory: userop.factory,
      factoryData: userop.factoryData,
      callData: userop.callData,
      callGasLimit: BigInt(userop.callGasLimit),
      verificationGasLimit: BigInt(userop.verificationGasLimit),
      preVerificationGas: BigInt(userop.preVerificationGas),
      maxFeePerGas: BigInt(userop.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(userop.maxPriorityFeePerGas),
      paymaster: userop.paymaster,
      paymasterVerificationGasLimit: userop.paymasterVerificationGasLimit
        ? BigInt(userop.paymasterVerificationGasLimit)
        : null,
      paymasterPostOpGasLimit: userop.paymasterPostOpGasLimit
        ? BigInt(userop.paymasterPostOpGasLimit)
        : null,
      paymasterData: userop.paymasterData,
      signature: userop.signature,
      entryPoint,
      chainId,
      validAfter: timeRange[0].toJSDate(),
      validUntil: timeRange[1].toJSDate(),
    });

    return { message: "Saved", hash: userOpHash };
  } catch (e) {
    throw new Error(
      `Failed to save UserOp to database: ${e instanceof Error ? e.message : "Unknown error"}`,
    );
  }
}

export async function deleteSavedOpFromDb(
  useropHash: string,
): Promise<{ message: string }> {
  try {
    const result = await db
      .delete(userops)
      .where(eq(userops.userophash, useropHash));

    if (result.rowCount > 0) {
      return { message: "Successfully deleted UserOp from database" };
    } else {
      return { message: "UserOp not found in database" };
    }
  } catch (e) {
    throw new Error(
      `Failed to delete UserOp from database: ${e instanceof Error ? e.message : "Unknown error"}`,
    );
  }
}

export async function fetchSavedOpsFromDb(
  chainId: ChainId,
  timeRange: [DateTime, DateTime],
): Promise<(UserOperation & { useropHash: string; key: bigint })[]> {
  try {
    const result = await db
      .select()
      .from(userops)
      .where(
        and(
          eq(userops.chainId, chainId),
          lte(userops.validAfter, timeRange[0].toJSDate()),
        ),
      )
      .orderBy(userops.validAfter);

    return result.map((row) => ({
      useropHash: row.userophash,
      key: BigInt(row.key),
      sender: row.sender,
      nonce: BigInt(row.nonce),
      factory: row.factory || undefined,
      factoryData: row.factoryData || undefined,
      callData: row.callData,
      callGasLimit: BigInt(row.callGasLimit),
      verificationGasLimit: BigInt(row.verificationGasLimit),
      preVerificationGas: BigInt(row.preVerificationGas),
      maxFeePerGas: BigInt(row.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(row.maxPriorityFeePerGas),
      paymaster: row.paymaster || undefined,
      paymasterVerificationGasLimit: row.paymasterVerificationGasLimit
        ? BigInt(row.paymasterVerificationGasLimit)
        : undefined,
      paymasterPostOpGasLimit: row.paymasterPostOpGasLimit
        ? BigInt(row.paymasterPostOpGasLimit)
        : undefined,
      paymasterData: row.paymasterData || undefined,
      signature: row.signature,
    }));
  } catch (e) {
    throw new Error(
      `Failed to fetch UserOps from database: ${e instanceof Error ? e.message : "Unknown error"}`,
    );
  }
}

export const getOpsBySender = async (
  sender: Address,
  chainId: undefined | number,
) => {
  if (chainId) {
    return await db
      .select()
      .from(userops)
      .where(
        and(
          eq(userops.sender, sender.toLowerCase()),
          eq(userops.chainId, chainId),
        ),
      );
  }

  return await db
    .select()
    .from(userops)
    .where(eq(userops.sender, sender.toLowerCase()));
};
