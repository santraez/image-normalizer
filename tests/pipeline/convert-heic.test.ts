import { describe, expect, it, vi } from "vitest";
import { HeicConversionError } from "../../src/errors.js";
import { convertHeic } from "../../src/pipeline/convert-heic.js";
import { createJpegFile, createPngFile } from "../helpers/fixtures.js";

vi.mock("heic-to", () => ({
  heicTo: vi.fn(),
}));

import { heicTo } from "heic-to";

const mockedHeicTo = vi.mocked(heicTo);

describe("convertHeic", () => {
  it("returns original file when mime is not HEIC/HEIF", async () => {
    const file = createPngFile();

    const result = await convertHeic(file, "image/png", 0.8);

    expect(result).toBe(file);
    expect(mockedHeicTo).not.toHaveBeenCalled();
  });

  it("converts HEIC to JPEG file", async () => {
    const file = createJpegFile("photo.heic");
    const convertedBlob = new Blob([new Uint8Array([1, 2, 3])], {
      type: "image/jpeg",
    });
    mockedHeicTo.mockResolvedValue(convertedBlob);

    const result = await convertHeic(file, "image/heic", 0.8);

    expect(mockedHeicTo).toHaveBeenCalledWith({
      blob: file,
      type: "image/jpeg",
      quality: 0.8,
    });
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("photo.jpg");
    expect(result.lastModified).toBe(file.lastModified);
  });

  it("converts HEIF to JPEG file", async () => {
    const file = createJpegFile("photo.heif");
    const convertedBlob = new Blob([new Uint8Array([1, 2, 3])], {
      type: "image/jpeg",
    });
    mockedHeicTo.mockResolvedValue(convertedBlob);

    const result = await convertHeic(file, "image/heif", 0.5);

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("photo.jpg");
  });

  it("wraps conversion errors in HeicConversionError", async () => {
    const file = createJpegFile("photo.heic");
    mockedHeicTo.mockRejectedValue(new Error("conversion failed"));

    await expect(convertHeic(file, "image/heic", 0.8)).rejects.toThrow(
      HeicConversionError,
    );
  });
});
