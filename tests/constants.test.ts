import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCEPTED_TYPES,
  DEFAULT_MAX_FILE_SIZE_MB,
  DEFAULT_MAX_WIDTH_OR_HEIGHT,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_QUALITY,
  resolveOptions,
} from "../src/constants.js";

describe("resolveOptions", () => {
  it("returns defaults when no options are provided", () => {
    const resolved = resolveOptions();

    expect(resolved.acceptedTypes).toEqual([...DEFAULT_ACCEPTED_TYPES]);
    expect(resolved.maxFileSize).toBe(DEFAULT_MAX_FILE_SIZE_MB * 1024 * 1024);
    expect(resolved.outputFormat).toBe(DEFAULT_OUTPUT_FORMAT);
    expect(resolved.quality).toBe(DEFAULT_QUALITY);
    expect(resolved.maxWidthOrHeight).toBe(DEFAULT_MAX_WIDTH_OR_HEIGHT);
    expect(resolved.useWebWorker).toBe(true);
  });

  it("respects custom maxFileSize over maxFileSizeMB", () => {
    const resolved = resolveOptions({
      maxFileSize: 5_000_000,
      maxFileSizeMB: 10,
    });

    expect(resolved.maxFileSize).toBe(5_000_000);
  });

  it("passes abort signal when provided", () => {
    const controller = new AbortController();
    const resolved = resolveOptions({ signal: controller.signal });

    expect(resolved.signal).toBe(controller.signal);
  });
});
