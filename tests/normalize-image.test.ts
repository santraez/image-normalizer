import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CompressionError,
  FileTooLargeError,
  HeicConversionError,
  UnknownFileTypeError,
  UnsupportedMimeError,
} from "../src/errors.js";
import { normalizeImage } from "../src/normalize-image.js";
import { createJpegFile, createPngFile } from "./helpers/fixtures.js";

vi.mock("file-type", () => ({
  fileTypeFromBlob: vi.fn(),
}));

vi.mock("heic-to", () => ({
  heicTo: vi.fn(),
}));

vi.mock("browser-image-compression", () => ({
  default: vi.fn(),
}));

import { fileTypeFromBlob } from "file-type";
import { heicTo } from "heic-to";
import imageCompression from "browser-image-compression";

const mockedFileTypeFromBlob = vi.mocked(fileTypeFromBlob);
const mockedHeicTo = vi.mocked(heicTo);
const mockedImageCompression = vi.mocked(imageCompression);

describe("normalizeImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes a supported image through the full pipeline", async () => {
    const file = createPngFile("photo.png");
    const compressed = new File([new Uint8Array([1, 2, 3])], "compressed.jpg", {
      type: "image/jpeg",
    });

    mockedFileTypeFromBlob.mockResolvedValue({ mime: "image/png", ext: "png" });
    mockedImageCompression.mockResolvedValue(compressed);

    const result = await normalizeImage(file, {
      outputFormat: "image/jpeg",
      quality: 0.8,
      maxWidthOrHeight: 1024,
    });

    expect(result.detectedMime).toBe("image/png");
    expect(result.originalSize).toBe(file.size);
    expect(result.file.name).toBe("photo.jpg");
    expect(result.file.type).toBe("image/jpeg");
    expect(mockedHeicTo).not.toHaveBeenCalled();
    expect(mockedImageCompression).toHaveBeenCalledWith(file, {
      maxWidthOrHeight: 1024,
      initialQuality: 0.8,
      fileType: "image/jpeg",
      preserveExif: false,
      useWebWorker: true,
    });
  });

  it("converts HEIC before compression", async () => {
    const file = createJpegFile("photo.heic");
    const convertedBlob = new Blob([new Uint8Array([4, 5, 6])], {
      type: "image/jpeg",
    });
    const compressed = new File([new Uint8Array([7, 8, 9])], "compressed.jpg", {
      type: "image/jpeg",
    });

    mockedFileTypeFromBlob.mockResolvedValue({ mime: "image/heic", ext: "heic" });
    mockedHeicTo.mockResolvedValue(convertedBlob);
    mockedImageCompression.mockResolvedValue(compressed);

    const result = await normalizeImage(file);

    expect(result.detectedMime).toBe("image/heic");
    expect(mockedHeicTo).toHaveBeenCalled();
    expect(mockedImageCompression).toHaveBeenCalled();
    expect(result.file.name).toBe("photo.jpg");
  });

  it("throws UnknownFileTypeError when mime cannot be detected", async () => {
    const file = createPngFile("unknown.bin");
    mockedFileTypeFromBlob.mockResolvedValue(undefined);

    await expect(normalizeImage(file)).rejects.toThrow(UnknownFileTypeError);
  });

  it("throws UnsupportedMimeError for disallowed mime types", async () => {
    const file = createPngFile("animation.gif");
    mockedFileTypeFromBlob.mockResolvedValue({ mime: "image/gif", ext: "gif" });

    await expect(normalizeImage(file)).rejects.toThrow(UnsupportedMimeError);
  });

  it("throws FileTooLargeError before conversion or compression", async () => {
    const file = createPngFile("large.png");
    Object.defineProperty(file, "size", { value: 20 * 1024 * 1024 });

    mockedFileTypeFromBlob.mockResolvedValue({ mime: "image/png", ext: "png" });

    await expect(
      normalizeImage(file, { maxFileSizeMB: 10 }),
    ).rejects.toThrow(FileTooLargeError);

    expect(mockedHeicTo).not.toHaveBeenCalled();
    expect(mockedImageCompression).not.toHaveBeenCalled();
  });

  it("throws HeicConversionError when HEIC conversion fails", async () => {
    const file = createJpegFile("photo.heic");
    mockedFileTypeFromBlob.mockResolvedValue({ mime: "image/heic", ext: "heic" });
    mockedHeicTo.mockRejectedValue(new Error("conversion failed"));

    await expect(normalizeImage(file)).rejects.toThrow(HeicConversionError);
    expect(mockedImageCompression).not.toHaveBeenCalled();
  });

  it("throws CompressionError when compression fails", async () => {
    const file = createPngFile("photo.png");
    mockedFileTypeFromBlob.mockResolvedValue({ mime: "image/png", ext: "png" });
    mockedImageCompression.mockRejectedValue(new Error("compression failed"));

    await expect(normalizeImage(file)).rejects.toThrow(CompressionError);
  });
});
