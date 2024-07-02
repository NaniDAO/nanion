import { bundlerClient } from "./bundler-client";
import { DUMMY_SIGNATURE } from "./constants";
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
  console.log("Simulating UserOp:", userOp);
  const estimate = bundlerClient.estimateUserOperationGas({
    userOperation: {
      ...userOp,
      signature: DUMMY_SIGNATURE, // so it does not fail due to not being in time range
    },
  });
  console.log("DUMMY_SIGNATURE", DUMMY_SIGNATURE);
  console.log("Estimated gas:", estimate);

  return { message: "Simulated UserOp" };
};
