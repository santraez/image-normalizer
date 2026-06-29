import type {
  AcceptedImageMime,
  NormalizeImageOptions,
  OutputFormat,
  ResolvedNormalizeImageOptions,
} from "./types.js";

export const DEFAULT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const satisfies readonly AcceptedImageMime[];

export const DEFAULT_MAX_FILE_SIZE_MB = 10;
export const DEFAULT_MAX_WIDTH_OR_HEIGHT = 2048;
export const DEFAULT_QUALITY = 0.8;
export const DEFAULT_OUTPUT_FORMAT = "image/jpeg" satisfies OutputFormat;

export const HEIC_MIME_TYPES = new Set<string>(["image/heic", "image/heif"]);

export const OUTPUT_FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function resolveOptions(
  options?: NormalizeImageOptions,
): ResolvedNormalizeImageOptions {
  const maxFileSize =
    options?.maxFileSize ??
    (options?.maxFileSizeMB ?? DEFAULT_MAX_FILE_SIZE_MB) * 1024 * 1024;

  const resolved: ResolvedNormalizeImageOptions = {
    acceptedTypes: [...(options?.acceptedTypes ?? DEFAULT_ACCEPTED_TYPES)],
    maxFileSize,
    outputFormat: options?.outputFormat ?? DEFAULT_OUTPUT_FORMAT,
    quality: options?.quality ?? DEFAULT_QUALITY,
    maxWidthOrHeight: options?.maxWidthOrHeight ?? DEFAULT_MAX_WIDTH_OR_HEIGHT,
    useWebWorker: options?.useWebWorker ?? true,
  };

  if (options?.signal !== undefined) {
    resolved.signal = options.signal;
  }

  return resolved;
}
