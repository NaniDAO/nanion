import type { Request, Response } from "express";
import { extractTimeRange, isWithinTimeRange } from "./utils";
import { getOpsBySender, saveUserOpToDb } from "./db";
import { executeUserOp } from "./userop-utils";
import {
  validateUserOpRequest,
  validateGetScheduledOps,
  validateGetNonce,
} from "./types";
import { z } from "zod";
import { TimeRangeError } from "./errors";
import { ENTRYPOINT_ADDRESS_V07, getAccountNonce } from "permissionless";
import { publicClient } from "./public-client";
import { getNonce, getSequence } from "eip-7582-utils";
import logger from "./logger";

export const ping = (_req: Request, res: Response) => {
  res.send("pong");
};

export const userop = async (req: Request, res: Response) => {
  try {
    const validatedData = validateUserOpRequest(req.body);
    const { userop, entryPoint, chainId } = validatedData;

    logger.info({ userop, entryPoint, chainId }, "Validated request");

    const timeRange = extractTimeRange(userop.signature);

    logger.info({ timeRange }, "Time Range");

    if (timeRange === undefined || isWithinTimeRange(timeRange)) {
      const result = await executeUserOp(userop, chainId);
      res.json(result);
    } else {
      logger.info("Saving userop to db");
      const result = await saveUserOpToDb(
        userop,
        entryPoint,
        chainId,
        timeRange,
      );
      logger.info({ result }, "Userop saved to db");
      res.json(result);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(error, "Zod error");
      res.status(400).json({
        error: "Validation Error",
        details: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      });
    } else if (error instanceof TimeRangeError) {
      // ... TimeRangeError handling remains the same
      logger.error(error, "TimeRangeError");
      res.status(400).json({
        error: "TimeRangeError",
        message: error.message,
      });
    } else if (error instanceof Error) {
      logger.error(error, "Unexpected error");
      res
        .status(500)
        .json({ error: "InternalServerError", message: error.message });
    } else {
      logger.error({ error }, "Unknown error");
      res.status(500).json({ error: "InternalServerError" });
    }
  }
};

export const getScheduledOps = async (req: Request, res: Response) => {
  try {
    const { sender, chainId } = validateGetScheduledOps(req.query);
    const ops = await getOpsBySender(sender, chainId);
    logger.info({ sender, chainId, ops }, "GetScheduledOps");
    res.json({
      ops,
    });
  } catch (e) {
    logger.error(e, "Error in getScheduledOps");
    res.status(500).json({
      error: "InternalServerError",
      message: e instanceof Error ? e.message : undefined,
    });
  }
};

export const getSenderNonce = async (req: Request, res: Response) => {
  try {
    const { sender, key, chainId } = validateGetNonce(req.query);
    logger.info({ sender, key, chainId }, "GetNonce validated");
    const ops = await getOpsBySender(sender, chainId);
    logger.info({ ops }, "Retrieved ops");
    const entryPointNonce = await getAccountNonce(publicClient, {
      sender,
      key,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
    });
    logger.info({ entryPointNonce }, "Entry point nonce");
    const nonce =
      ops.length > 0
        ? getNonce(key, BigInt(ops.length) + getSequence(entryPointNonce))
        : entryPointNonce;
    logger.info({ nonce }, "Calculated nonce");
    res.json({ nonce: nonce.toString() });
  } catch (e) {
    logger.error(e, "Error in getSenderNonce");
    res.status(500).json({
      error: "InternalServerError",
      message: e instanceof Error ? e.message : undefined,
    });
  }
};
