import cron from "node-cron";
import { executeUserOp } from "./userop-utils";
import { fetchSavedOpsFromDb, deleteSavedOpFromDb } from "./db";
import { arbitrum } from "viem/chains";
import { DateTime } from "luxon";
import { extractTimeRange } from "./utils";
import { TimeRangeError } from "./errors";

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const executeOpWithRetry = async (op, chainId) => {
  const { useropHash, key, ...rest } = op;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // if op validUntil has passed then delete op
      try {
        extractTimeRange(op.signature);
      } catch (e) {
        if (e instanceof TimeRangeError) {
          if (e.message.includes("expired")) {
            await deleteSavedOpFromDb(useropHash);
            console.log(`Operation ${useropHash} expired, deleted from DB`);
            return false;
          } else {
            console.log(`Skipping`);
            return false;
          }
        }
      }

      await executeUserOp({ ...rest }, chainId);
      await deleteSavedOpFromDb(useropHash);
      console.log(`Operation ${useropHash} executed successfully`);
      return true;
    } catch (error) {
      console.error(
        `Attempt ${attempt} failed for operation ${useropHash}:`,
        error,
      );

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY);
      } else {
        console.error(
          `Operation ${useropHash} failed after ${MAX_RETRIES} attempts. Ignoring for now.`,
        );
        return false;
      }
    }
  }
};

let isJobRunning = false;

const runWorker = () => {
  const job = cron.schedule("* * * * *", async () => {
    if (isJobRunning) {
      console.log("Previous job still running, skipping this iteration");
      return;
    }

    isJobRunning = true;
    try {
      const savedOps = await fetchSavedOpsFromDb(arbitrum.id, [
        DateTime.now(),
        DateTime.now().plus({ minutes: 30 }),
      ]);
      console.log(`Found ${savedOps.length} operations to process`);

      const results = await Promise.all(
        savedOps.map((op) => executeOpWithRetry(op, arbitrum.id)),
      );
      const successCount = results.filter(Boolean).length;
      console.log(
        `Successfully executed ${successCount} out of ${savedOps.length} operations`,
      );
    } catch (error) {
      console.error("Error in worker:", error);
    } finally {
      isJobRunning = false;
    }
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("Gracefully shutting down worker");
    job.stop();
    process.exit(0);
  });
};

runWorker();
