import { OUTPUT_FORMAT_EXTENSIONS } from "../constants.js";
import type { NormalizeImageResult, OutputFormat } from "../types.js";

function replaceExtension(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return `${baseName}.${extension}`;
}

export function createResult(
  originalFile: File,
  normalizedFile: File,
  detectedMime: string,
  outputFormat: OutputFormat,
): NormalizeImageResult {
  const extension = OUTPUT_FORMAT_EXTENSIONS[outputFormat];
  const finalFile = new File(
    [normalizedFile],
    replaceExtension(originalFile.name, extension),
    {
      type: outputFormat,
      lastModified: originalFile.lastModified,
    },
  );

  return {
    file: finalFile,
    detectedMime,
    originalSize: originalFile.size,
    normalizedSize: finalFile.size,
  };
}
