import { FileTooLargeError } from "../errors.js";

export function validateFileSize(fileSize: number, maxFileSize: number): void {
  if (fileSize > maxFileSize) {
    throw new FileTooLargeError(fileSize, maxFileSize);
  }
}
