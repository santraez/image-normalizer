import { UnsupportedMimeError } from "../errors.js";
import type { AcceptedImageMime } from "../types.js";

export function validateMime(
  detectedMime: string,
  acceptedTypes: readonly AcceptedImageMime[],
): void {
  if (!acceptedTypes.includes(detectedMime as AcceptedImageMime)) {
    throw new UnsupportedMimeError(detectedMime, acceptedTypes);
  }
}
