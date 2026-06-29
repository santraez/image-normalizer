import { fileTypeFromBlob } from "file-type";

import { UnknownFileTypeError } from "../errors.js";

export interface DetectedMime {
  mime: string;
  ext: string;
}

export async function detectMime(file: File): Promise<DetectedMime> {
  const result = await fileTypeFromBlob(file);

  if (!result) {
    throw new UnknownFileTypeError(file.name);
  }

  return {
    mime: result.mime,
    ext: result.ext,
  };
}
