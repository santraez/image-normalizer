export { normalizeImage } from "./normalize-image.js";

export type {
  AcceptedImageMime,
  NormalizeImageOptions,
  NormalizeImageResult,
  OutputFormat,
} from "./types.js";

export {
  CompressionError,
  FileTooLargeError,
  HeicConversionError,
  ImageNormalizerError,
  UnknownFileTypeError,
  UnsupportedMimeError,
} from "./errors.js";

export type { ImageNormalizerErrorCode } from "./errors.js";
