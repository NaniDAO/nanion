import { bundlerClient } from "./bundler-client";
import { DUMMY_SIGNATURE } from "./constants";
import logger from "./logger";
import { type UserOperation, ChainId, Hex32 } from "./types";

export async function executeUserOp(
  userOp: UserOperation,
  _chainId: ChainId,
): Promise<{ hash: Hex32 }> {
  try {
    const userOpHash = (await bundlerClient.sendUserOperation({
      userOperation: userOp,
    })) as Hex32;

    return {
      hash: userOpHash,
    };
  } catch (error) {
    console.error("Error executing UserOp:", error);
    throw new Error("Failed to execute UserOp");
  }
}

export const simulateUserOp = async (
  userOp: UserOperation,
  _chainId: ChainId,
) => {
  logger.info({ userOp }, "Simulating UserOp:");
  const estimate = bundlerClient.estimateUserOperationGas({
    userOperation: {
      ...userOp,
      signature: DUMMY_SIGNATURE, // so it does not fail due to not being in time range
    },
  });
  logger.info({ DUMMY_SIGNATURE }, "DUMMY_SIGNATURE");
  logger.info({ estimate }, "Estimated gas:");

  return { message: "Simulated UserOp" };
};
