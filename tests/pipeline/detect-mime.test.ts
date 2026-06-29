import { describe, expect, it, vi } from "vitest";
import { UnknownFileTypeError } from "../../src/errors.js";
import { detectMime } from "../../src/pipeline/detect-mime.js";
import { createPngFile } from "../helpers/fixtures.js";

vi.mock("file-type", () => ({
  fileTypeFromBlob: vi.fn(),
}));

import { fileTypeFromBlob } from "file-type";

const mockedFileTypeFromBlob = vi.mocked(fileTypeFromBlob);

describe("detectMime", () => {
  it("returns detected mime and extension from magic bytes", async () => {
    const file = createPngFile();
    mockedFileTypeFromBlob.mockResolvedValue({ mime: "image/png", ext: "png" });

    const result = await detectMime(file);

    expect(result).toEqual({ mime: "image/png", ext: "png" });
    expect(mockedFileTypeFromBlob).toHaveBeenCalledWith(file);
  });

  it("throws UnknownFileTypeError when detection fails", async () => {
    const file = createPngFile("unknown.bin");
    mockedFileTypeFromBlob.mockResolvedValue(undefined);

    await expect(detectMime(file)).rejects.toThrow(UnknownFileTypeError);
  });
});
