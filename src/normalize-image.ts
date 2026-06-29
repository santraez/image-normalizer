import { resolveOptions } from "./constants.js";
import { detectMime } from "./pipeline/detect-mime.js";
import { validateMime } from "./pipeline/validate-mime.js";
import { validateFileSize } from "./pipeline/validate-file-size.js";
import { convertHeic } from "./pipeline/convert-heic.js";
import { compressImage } from "./pipeline/compress-image.js";
import { createResult } from "./pipeline/create-result.js";
import type { NormalizeImageOptions, NormalizeImageResult } from "./types.js";

export async function normalizeImage(
  file: File,
  options?: NormalizeImageOptions,
): Promise<NormalizeImageResult> {
  const resolvedOptions = resolveOptions(options);

  const { mime: detectedMime } = await detectMime(file);

  validateMime(detectedMime, resolvedOptions.acceptedTypes);
  validateFileSize(file.size, resolvedOptions.maxFileSize);

  const convertedFile = await convertHeic(
    file,
    detectedMime,
    resolvedOptions.quality,
  );

  const compressedFile = await compressImage(convertedFile, resolvedOptions);

  return createResult(
    file,
    compressedFile,
    detectedMime,
    resolvedOptions.outputFormat,
  );
}
