import { heicTo } from "heic-to";

import { HEIC_MIME_TYPES } from "../constants.js";
import { HeicConversionError } from "../errors.js";

function replaceExtension(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return `${baseName}.${extension}`;
}

export async function convertHeic(
  file: File,
  detectedMime: string,
  quality: number,
): Promise<File> {
  if (!HEIC_MIME_TYPES.has(detectedMime)) {
    return file;
  }

  try {
    const convertedBlob = await heicTo({
      blob: file,
      type: "image/jpeg",
      quality,
    });

    return new File([convertedBlob], replaceExtension(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch (error) {
    throw new HeicConversionError(
      `Failed to convert HEIC/HEIF image "${file.name}" to JPEG.`,
      error,
    );
  }
}
