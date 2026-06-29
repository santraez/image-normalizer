import imageCompression from "browser-image-compression";

import { CompressionError } from "../errors.js";
import type { OutputFormat, ResolvedNormalizeImageOptions } from "../types.js";

export async function compressImage(
  file: File,
  options: Pick<
    ResolvedNormalizeImageOptions,
    "outputFormat" | "quality" | "maxWidthOrHeight" | "useWebWorker" | "signal"
  >,
): Promise<File> {
  try {
    const compressionOptions: Parameters<typeof imageCompression>[1] = {
      maxWidthOrHeight: options.maxWidthOrHeight,
      initialQuality: options.quality,
      fileType: options.outputFormat satisfies OutputFormat,
      preserveExif: false,
      useWebWorker: options.useWebWorker,
    };

    if (options.signal !== undefined) {
      compressionOptions.signal = options.signal;
    }

    const compressedFile = await imageCompression(file, compressionOptions);
    return compressedFile;
  } catch (error) {
    throw new CompressionError(
      `Failed to compress image "${file.name}".`,
      error,
    );
  }
}
