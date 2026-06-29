import { describe, expect, it } from "vitest";
import { createResult } from "../../src/pipeline/create-result.js";
import { createPngFile } from "../helpers/fixtures.js";

describe("createResult", () => {
  it("creates normalized result with correct metadata", () => {
    const original = createPngFile("vacation.PNG");
    const normalized = new File([new Uint8Array([1, 2, 3])], "temp.bin", {
      type: "image/jpeg",
    });

    const result = createResult(
      original,
      normalized,
      "image/png",
      "image/jpeg",
    );

    expect(result.detectedMime).toBe("image/png");
    expect(result.originalSize).toBe(original.size);
    expect(result.normalizedSize).toBe(normalized.size);
    expect(result.file.type).toBe("image/jpeg");
    expect(result.file.name).toBe("vacation.jpg");
    expect(result.file.lastModified).toBe(original.lastModified);
  });

  it("uses output format extension for final file name", () => {
    const original = createPngFile("photo.png");
    const normalized = new File([new Uint8Array([1])], "temp.bin", {
      type: "image/webp",
    });

    const result = createResult(
      original,
      normalized,
      "image/png",
      "image/webp",
    );

    expect(result.file.name).toBe("photo.webp");
    expect(result.file.type).toBe("image/webp");
  });
});
