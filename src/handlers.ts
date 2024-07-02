import type { Request, Response } from "express";
import { extractTimeRange, isWithinTimeRange } from "./utils";
import { saveUserOpToDb } from "./db";
import { executeUserOp } from "./userop-utils";
import { validateUserOpRequest } from "./types";
import { z } from "zod";
import { TimeRangeError } from "./errors";

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
        error: "Time Range Error",
        message: error.message,
      });
    } else if (error instanceof Error) {
      console.error("Unexpected error:", error);
      res
        .status(500)
        .json({ error: "Internal Server Error", message: error.message });
    } else {
      console.error("Unknown error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};
