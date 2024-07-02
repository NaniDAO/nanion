import { DateTime } from "luxon";
import { extractTimeRange } from "../src/utils.ts";
import { TimeRangeError } from "../src/errors.ts";
import { test, expect, describe, beforeAll, afterAll } from "bun:test";

describe("extractTimeRange", () => {
  const mockNow = DateTime.fromISO("2023-01-01T00:00:00Z");
  let originalNow: typeof DateTime.now;

  beforeAll(() => {
    originalNow = DateTime.now;
    DateTime.now = (() => mockNow) as typeof DateTime.now;
  });

  afterAll(() => {
    DateTime.now = originalNow;
  });

  const now = mockNow;
  const future = now.plus({ months: 6 });

  test("should extract valid time range", () => {
    const validAfter = now.toSeconds();
    const validUntil = future.toSeconds();
    const signature =
      "0x" +
      validAfter.toString(16).padStart(12, "0") +
      validUntil.toString(16).padStart(12, "0");
    const [extractedValidAfter, extractedValidUntil] =
      extractTimeRange(signature)!;
    expect(extractedValidAfter.toSeconds()).toBe(validAfter);
    expect(extractedValidUntil.toSeconds()).toBe(validUntil);
  });

  test("should handle signatures without 0x prefix", () => {
    const validAfter = now.toSeconds();
    const validUntil = future.toSeconds();
    const signature =
      validAfter.toString(16).padStart(12, "0") +
      validUntil.toString(16).padStart(12, "0");
    const [extractedValidAfter, extractedValidUntil] =
      extractTimeRange(signature)!;
    expect(extractedValidAfter.toSeconds()).toBe(validAfter);
    expect(extractedValidUntil.toSeconds()).toBe(validUntil);
  });

  test("should throw Error for short signature", () => {
    const signature = "0x123";
    expect(() => extractTimeRange(signature)).toThrow(Error);
    expect(() => extractTimeRange(signature)).toThrow("Signature is too short");
  });

  test("should throw TimeRangeError for expired time", () => {
    const validAfter = now.minus({ years: 2 }).toSeconds();
    const validUntil = now.minus({ years: 1 }).toSeconds();
    const signature =
      "0x" +
      validAfter.toString(16).padStart(12, "0") +
      validUntil.toString(16).padStart(12, "0");
    expect(() => extractTimeRange(signature)).toThrow(TimeRangeError);
    expect(() => extractTimeRange(signature)).toThrow(
      "`validUntil` is in the past (expired)",
    );
  });

  test("should throw TimeRangeError for time too far in the future", () => {
    const validAfter = now.toSeconds();
    const validUntil = now.plus({ years: 2 }).toSeconds();
    const signature =
      "0x" +
      validAfter.toString(16).padStart(12, "0") +
      validUntil.toString(16).padStart(12, "0");
    expect(() => extractTimeRange(signature)).toThrow(TimeRangeError);
    expect(() => extractTimeRange(signature)).toThrow(
      "`validUntil` exceeds max one year period",
    );
  });

  test("should throw TimeRangeError when validUntil is before validAfter", () => {
    const validAfter = future.toSeconds();
    const validUntil = now.toSeconds();
    const signature =
      "0x" +
      validAfter.toString(16).padStart(12, "0") +
      validUntil.toString(16).padStart(12, "0");
    expect(() => extractTimeRange(signature)).toThrow(TimeRangeError);
    expect(() => extractTimeRange(signature)).toThrow(
      "`validUntil` must be later than `validAfter`",
    );
  });

  test("should return undefined for all zero time bytes", () => {
    const signature = "0x" + "0".repeat(24) + "1".repeat(40); // 24 zeros followed by some non-zero bytes
    const result = extractTimeRange(signature);
    expect(result).toBeUndefined();
  });

  test("should return undefined for all zero time bytes without 0x prefix", () => {
    const signature = "0".repeat(24) + "1".repeat(40); // 24 zeros followed by some non-zero bytes
    const result = extractTimeRange(signature);
    expect(result).toBeUndefined();
  });

  test("should not return undefined for non-zero time bytes", () => {
    const validAfter = now.toSeconds();
    const validUntil = future.toSeconds();
    const signature =
      "0x" +
      validAfter.toString(16).padStart(12, "0") +
      validUntil.toString(16).padStart(12, "0");
    const result = extractTimeRange(signature);
    expect(result).not.toBeUndefined();
  });
});
