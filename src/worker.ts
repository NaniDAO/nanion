import cron from "node-cron";
import { executeUserOp } from "./userop-utils";
import { fetchSavedOpsFromDb, deleteSavedOpFromDb } from "./db";
import { arbitrum } from "viem/chains";
import { DateTime } from "luxon";

const runWorker = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const savedOps = await fetchSavedOpsFromDb(arbitrum.id, [
        DateTime.now(),
        DateTime.now().plus({ minutes: 30 }),
      ]);
      console.log("savedOps", savedOps);
      for (const op of savedOps) {
        const { useropHash, ...rest } = op;
        await executeUserOp(
          {
            ...rest,
          },
          arbitrum.id,
        );
        await deleteSavedOpFromDb(op.useropHash);
      }
    } catch (error) {
      console.error("Error in worker:", error);
    }
  });
};

runWorker();
