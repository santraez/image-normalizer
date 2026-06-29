export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export type AcceptedImageMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif";

export interface NormalizeImageOptions {
  acceptedTypes?: AcceptedImageMime[];
  maxFileSizeMB?: number;
  maxFileSize?: number;
  outputFormat?: OutputFormat;
  quality?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  signal?: AbortSignal;
}

export interface NormalizeImageResult {
  file: File;
  detectedMime: string;
  originalSize: number;
  normalizedSize: number;
}

export interface ResolvedNormalizeImageOptions {
  acceptedTypes: AcceptedImageMime[];
  maxFileSize: number;
  outputFormat: OutputFormat;
  quality: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  signal?: AbortSignal;
}
