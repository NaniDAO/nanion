import { DateTime } from "luxon";
import { TimeRangeError } from "./errors";

export function extractTimeRange(
  signature: string,
): [DateTime, DateTime] | undefined {
  signature = signature.startsWith("0x") ? signature.slice(2) : signature;
  if (signature.length < 24) {
    throw new Error("Signature is too short");
  }
  const timeBytes = signature.slice(0, 24);

  // Check if all time bytes are zeros
  if (/^0+$/.test(timeBytes)) {
    return undefined;
  }

  const validUntil = parseInt(timeBytes.slice(0, 12), 16);
  const validAfter = parseInt(timeBytes.slice(12, 24), 16);
  const now = DateTime.now();
  const validAfterDateTime = DateTime.fromSeconds(validAfter);
  const validUntilDateTime = DateTime.fromSeconds(validUntil);

  if (validUntilDateTime < now) {
    throw new TimeRangeError("`validUntil` is in the past (expired)");
  }
  if (validUntilDateTime > now.plus({ years: 1 })) {
    throw new TimeRangeError("`validUntil` exceeds max one year period");
  }
  if (validUntilDateTime <= validAfterDateTime) {
    throw new TimeRangeError("`validUntil` must be later than `validAfter`");
  }
  return [validAfterDateTime, validUntilDateTime];
}

export function isWithinTimeRange(
  timeRange: [DateTime, DateTime] | undefined,
): boolean {
  if (!timeRange) return false;
  console.log("timeRange", timeRange);
  const now = DateTime.now();
  return now >= timeRange[0] && now <= timeRange[1];
}
