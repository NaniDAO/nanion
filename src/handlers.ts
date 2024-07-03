import type { Request, Response } from "express";
import { extractTimeRange, isWithinTimeRange } from "./utils";
import { fetchSavedOpsFromDb, getOpsBySender, saveUserOpToDb } from "./db";
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

export const ping = (_req: Request, res: Response) => {
  res.send("pong");
};

export const userop = async (req: Request, res: Response) => {
  try {
    const validatedData = validateUserOpRequest(req.body);
    const { userop, entryPoint, chainId } = validatedData;

    console.log("Validated request", userop, entryPoint, chainId);

    const timeRange = extractTimeRange(userop.signature);

    console.log("Time Range", timeRange);

    if (timeRange === undefined || isWithinTimeRange(timeRange)) {
      const result = await executeUserOp(userop, chainId);
      res.json(result);
    } else {
      console.log("Saving userop to db");
      const result = await saveUserOpToDb(
        userop,
        entryPoint,
        chainId,
        timeRange,
      );
      console.log("Userop saved to db", result);
      res.json(result);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation Error",
        details: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      });
    } else if (error instanceof TimeRangeError) {
      res.status(400).json({
        error: "TimeRangeError",
        message: error.message,
      });
    } else if (error instanceof Error) {
      console.error("Unexpected error:", error);
      res
        .status(500)
        .json({ error: "InternalServerError", message: error.message });
    } else {
      console.error("Unknown error:", error);
      res.status(500).json({ error: "InternalServerError" });
    }
  }
};

export const getScheduledOps = async (req: Request, res: Response) => {
  try {
    const { sender, chainId } = validateGetScheduledOps(req.query);
    const ops = await getOpsBySender(sender, chainId);
    console.log("GetScheduledOps", sender, chainId, ops);
    res.json({
      ops,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "InternalServerError",
      message: e instanceof Error ? e.message : undefined,
    });
  }
};

export const getSenderNonce = async (req: Request, res: Response) => {
  try {
    console.log("GetNonce", req.query);
    const { sender, key, chainId } = validateGetNonce(req.query);
    console.log("GetNonce", sender, key, chainId);
    const ops = await getOpsBySender(sender, chainId);
    console.log("ops", ops);
    const entryPointNonce = await getAccountNonce(publicClient, {
      sender,
      key,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
    });
    console.log("entryPointNonce", entryPointNonce);
    const nonce =
      ops.length > 0
        ? getNonce(key, BigInt(ops.length) + getSequence(entryPointNonce))
        : entryPointNonce;
    console.log("nonce", nonce);
    res.json({ nonce: nonce.toString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "InternalServerError",
      message: e instanceof Error ? e.message : undefined,
    });
  }
};
