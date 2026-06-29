import { describe, expect, it } from "vitest";
import { FileTooLargeError } from "../../src/errors.js";
import { validateFileSize } from "../../src/pipeline/validate-file-size.js";

describe("validateFileSize", () => {
  it("passes when file size is within limit", () => {
    expect(() => validateFileSize(1024, 2048)).not.toThrow();
  });

  it("passes when file size equals limit", () => {
    expect(() => validateFileSize(2048, 2048)).not.toThrow();
  });

  it("throws FileTooLargeError when file exceeds limit", () => {
    expect(() => validateFileSize(3000, 2048)).toThrow(FileTooLargeError);
  });

  it("includes sizes in error", () => {
    try {
      validateFileSize(3000, 2048);
    } catch (error) {
      expect(error).toBeInstanceOf(FileTooLargeError);
      const sizeError = error as FileTooLargeError;
      expect(sizeError.fileSize).toBe(3000);
      expect(sizeError.maxFileSize).toBe(2048);
      expect(sizeError.code).toBe("FILE_TOO_LARGE");
    }
  });
});
