export type ImageNormalizerErrorCode =
  | "UNSUPPORTED_MIME"
  | "UNKNOWN_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "HEIC_CONVERSION_FAILED"
  | "COMPRESSION_FAILED";

export class ImageNormalizerError extends Error {
  readonly code: ImageNormalizerErrorCode;

  constructor(message: string, code: ImageNormalizerErrorCode) {
    super(message);
    this.name = "ImageNormalizerError";
    this.code = code;
  }
}

export class UnsupportedMimeError extends ImageNormalizerError {
  readonly detectedMime: string;
  readonly acceptedTypes: readonly string[];

  constructor(detectedMime: string, acceptedTypes: readonly string[]) {
    super(
      `Unsupported file type "${detectedMime}". Accepted types: ${acceptedTypes.join(", ")}`,
      "UNSUPPORTED_MIME",
    );
    this.name = "UnsupportedMimeError";
    this.detectedMime = detectedMime;
    this.acceptedTypes = acceptedTypes;
  }
}

export class UnknownFileTypeError extends ImageNormalizerError {
  readonly fileName: string;

  constructor(fileName: string) {
    super(
      `Could not detect file type for "${fileName}". The file may be corrupted or unsupported.`,
      "UNKNOWN_FILE_TYPE",
    );
    this.name = "UnknownFileTypeError";
    this.fileName = fileName;
  }
}

export class FileTooLargeError extends ImageNormalizerError {
  readonly fileSize: number;
  readonly maxFileSize: number;

  constructor(fileSize: number, maxFileSize: number) {
    super(
      `File size ${fileSize} bytes exceeds maximum allowed size of ${maxFileSize} bytes.`,
      "FILE_TOO_LARGE",
    );
    this.name = "FileTooLargeError";
    this.fileSize = fileSize;
    this.maxFileSize = maxFileSize;
  }
}

export class HeicConversionError extends ImageNormalizerError {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, "HEIC_CONVERSION_FAILED");
    this.name = "HeicConversionError";
    this.cause = cause;
  }
}

export class CompressionError extends ImageNormalizerError {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, "COMPRESSION_FAILED");
    this.name = "CompressionError";
    this.cause = cause;
  }
}
