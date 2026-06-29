import { describe, expect, it } from "vitest";
import { UnsupportedMimeError } from "../../src/errors.js";
import { validateMime } from "../../src/pipeline/validate-mime.js";

describe("validateMime", () => {
  const acceptedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ] as const;

  it("passes when detected mime is accepted", () => {
    expect(() => validateMime("image/png", acceptedTypes)).not.toThrow();
  });

  it("throws UnsupportedMimeError when mime is not accepted", () => {
    expect(() => validateMime("image/gif", acceptedTypes)).toThrow(
      UnsupportedMimeError,
    );
  });

  it("includes detected mime and accepted types in error", () => {
    try {
      validateMime("image/gif", acceptedTypes);
    } catch (error) {
      expect(error).toBeInstanceOf(UnsupportedMimeError);
      const mimeError = error as UnsupportedMimeError;
      expect(mimeError.detectedMime).toBe("image/gif");
      expect(mimeError.acceptedTypes).toEqual(acceptedTypes);
      expect(mimeError.code).toBe("UNSUPPORTED_MIME");
    }
  });
});
