import { describe, expect, it, vi } from "vitest";
import { CompressionError } from "../../src/errors.js";
import { compressImage } from "../../src/pipeline/compress-image.js";
import { createPngFile } from "../helpers/fixtures.js";

vi.mock("browser-image-compression", () => ({
  default: vi.fn(),
}));

import imageCompression from "browser-image-compression";

const mockedImageCompression = vi.mocked(imageCompression);

describe("compressImage", () => {
  const options = {
    outputFormat: "image/jpeg" as const,
    quality: 0.8,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
  };

  it("compresses image with mapped options", async () => {
    const file = createPngFile();
    const compressed = createPngFile("compressed.png");
    mockedImageCompression.mockResolvedValue(compressed);

    const result = await compressImage(file, options);

    expect(result).toBe(compressed);
    expect(mockedImageCompression).toHaveBeenCalledWith(file, {
      maxWidthOrHeight: 2048,
      initialQuality: 0.8,
      fileType: "image/jpeg",
      preserveExif: false,
      useWebWorker: true,
    });
  });

  it("passes abort signal when provided", async () => {
    const file = createPngFile();
    const controller = new AbortController();
    const compressed = createPngFile("compressed.png");
    mockedImageCompression.mockResolvedValue(compressed);

    await compressImage(file, { ...options, signal: controller.signal });

    expect(mockedImageCompression).toHaveBeenCalledWith(file, {
      maxWidthOrHeight: 2048,
      initialQuality: 0.8,
      fileType: "image/jpeg",
      preserveExif: false,
      useWebWorker: true,
      signal: controller.signal,
    });
  });

  it("wraps compression errors in CompressionError", async () => {
    const file = createPngFile();
    mockedImageCompression.mockRejectedValue(new Error("compression failed"));

    await expect(compressImage(file, options)).rejects.toThrow(
      CompressionError,
    );
  });
});
