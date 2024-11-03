import cron from "node-cron";
import { executeUserOp } from "./userop-utils";
import { fetchSavedOpsFromDb, deleteSavedOpFromDb } from "./db";
import { DateTime } from "luxon";
import { extractTimeRange } from "./utils";
import { TimeRangeError } from "./errors";
import logger from "./logger";
import { ChainId } from "./types";

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
            logger.info(`Operation ${useropHash} expired, deleted from DB`);
            return false;
          } else {
            logger.info(`Skipping`);
            return false;
          }
        }
      }

      await executeUserOp({ ...rest }, chainId);
      await deleteSavedOpFromDb(useropHash);
      logger.info(`Operation ${useropHash} executed successfully`);
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

const chains = [ChainId.Mainnet, ChainId.Arbitrum, ChainId.Base];

const runWorker = () => {
  const job = cron.schedule("* * * * *", async () => {
    if (isJobRunning) {
      logger.info("Previous job still running, skipping this iteration");
      return;
    }

    isJobRunning = true;
    try {
      for (const chainId of chains) {
        const savedOps = await fetchSavedOpsFromDb(chainId, [
          DateTime.now(),
          DateTime.now().plus({ minutes: 30 }),
        ]);
        logger.info(
          `Found ${savedOps.length} operations to process for chain ${chainId}`,
        );

        const results = await Promise.all(
          savedOps.map((op) => executeOpWithRetry(op, chainId)),
        );
        const successCount = results.filter(Boolean).length;
        logger.info(
          `Successfully executed ${successCount} out of ${savedOps.length} operations on chain ${chainId}`,
        );
      }
    } catch (error) {
      console.error("Error in worker:", error);
    } finally {
      isJobRunning = false;
    }
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    logger.info("Gracefully shutting down worker");
    job.stop();
    process.exit(0);
  });
};

runWorker();
