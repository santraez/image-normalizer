# image-normalizer

TypeScript library for preprocessing and normalizing images in **browser** web applications.

Users pick photos from any device — Android, iPhone, or desktop — and you get back a validated, resized, compressed `File` ready to upload. One function handles MIME detection, HEIC conversion, validation, and compression.

## Table of contents

- [Why use this library?](#why-use-this-library)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Examples](#examples)
  - [File input (vanilla JS)](#file-input-vanilla-js)
  - [React](#react)
  - [Drag and drop](#drag-and-drop)
  - [Upload with `fetch`](#upload-with-fetch)
  - [Cancel with `AbortSignal`](#cancel-with-abortsignal)
  - [Restrict allowed formats](#restrict-allowed-formats)
  - [iPhone HEIC photos](#iphone-heic-photos)
  - [Error handling](#error-handling)
- [API reference](#api-reference)
  - [`normalizeImage`](#normalizeimagefile-options)
  - [`NormalizeImageOptions`](#normalizeimageoptions)
  - [`NormalizeImageResult`](#normalizeimageresult)
  - [Exported types](#exported-types)
  - [Exported errors](#exported-errors)
- [How it works](#how-it-works)
- [Supported formats](#supported-formats)
- [Content Security Policy](#content-security-policy)
- [FAQ](#faq)
- [Development](#development)
- [License](#license)

---

## Why use this library?

Uploading user images in web apps is harder than it looks:

| Problem | What `image-normalizer` does |
| --- | --- |
| Users rename files or pick wrong extensions | Detects the **real** MIME type from file magic bytes (`file-type`) |
| iPhone photos are HEIC/HEIF | Converts them to JPEG automatically (`heic-to`) |
| Large photos slow uploads | Resizes and compresses in the browser (`browser-image-compression`) |
| You need consistent output | Returns a new `File` with your chosen format, size limits, and quality |

The original `File` is **never modified**. You always receive a fresh normalized copy.

---

## Requirements

- **Browser only** — relies on `File`, `Blob`, `AbortSignal`, and Web Workers.
- **ES modules** — `import { normalizeImage } from "image-normalizer"`.
- Works with React, Vue, Svelte, Angular, or plain HTML/JS.

> This package does **not** run in Node.js. Use it on the client before uploading to your server.

---

## Installation

```bash
pnpm add image-normalizer
# or
npm install image-normalizer
# or
yarn add image-normalizer
```

---

## Quick start

```typescript
import { normalizeImage } from "image-normalizer";

const input = document.querySelector<HTMLInputElement>("#photo");

input?.addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const result = await normalizeImage(file);

  console.log(result.file);           // normalized File
  console.log(result.detectedMime);   // e.g. "image/heic"
  console.log(result.originalSize);   // bytes before
  console.log(result.normalizedSize); // bytes after
});
```

All options have sensible defaults (10 MB max, 2048 px max dimension, JPEG output, 0.8 quality). See [API reference](#api-reference) to customize.

---

## Examples

### File input (vanilla JS)

```html
<input type="file" id="photo" accept="image/*" />
<p id="status"></p>

<script type="module">
  import { normalizeImage } from "image-normalizer";

  const input = document.querySelector("#photo");
  const status = document.querySelector("#status");

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    status.textContent = "Processing…";

    try {
      const { file: normalized, originalSize, normalizedSize } =
        await normalizeImage(file, {
          maxFileSizeMB: 10,
          maxWidthOrHeight: 1920,
          quality: 0.85,
          outputFormat: "image/jpeg",
        });

      const saved = ((1 - normalizedSize / originalSize) * 100).toFixed(0);
      status.textContent = `Ready: ${normalized.name} (${saved}% smaller)`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Failed";
    }
  });
</script>
```

### React

```tsx
import { useState } from "react";
import { normalizeImage } from "image-normalizer";
import {
  FileTooLargeError,
  UnsupportedMimeError,
} from "image-normalizer";

export function PhotoUpload() {
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const result = await normalizeImage(file, {
        maxWidthOrHeight: 2048,
        outputFormat: "image/webp",
      });

      setPreview(URL.createObjectURL(result.file));
      // upload result.file to your API
    } catch (err) {
      if (err instanceof UnsupportedMimeError) {
        setError(`Unsupported type: ${err.detectedMime}`);
      } else if (err instanceof FileTooLargeError) {
        setError("File is too large. Max 10 MB.");
      } else {
        setError("Could not process image.");
      }
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleChange} />
      {error && <p role="alert">{error}</p>}
      {preview && <img src={preview} alt="Preview" width={200} />}
    </div>
  );
}
```

### Drag and drop

```typescript
import { normalizeImage } from "image-normalizer";

const dropZone = document.querySelector<HTMLElement>("#drop-zone")!;

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");

  const file = e.dataTransfer?.files[0];
  if (!file) return;

  const result = await normalizeImage(file);
  await uploadToServer(result.file);
});
```

### Upload with `fetch`

```typescript
import { normalizeImage } from "image-normalizer";

async function uploadPhoto(file: File) {
  const { file: normalized } = await normalizeImage(file, {
    maxWidthOrHeight: 1600,
    quality: 0.8,
    outputFormat: "image/jpeg",
  });

  const formData = new FormData();
  formData.append("photo", normalized, normalized.name);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json();
}
```

### Cancel with `AbortSignal`

Useful when the user navigates away or clicks "Cancel" during processing.

```typescript
import { normalizeImage } from "image-normalizer";

const controller = new AbortController();

// Call controller.abort() to cancel
document.querySelector("#cancel")?.addEventListener("click", () => {
  controller.abort();
});

try {
  const result = await normalizeImage(file, {
    signal: controller.signal,
  });
} catch (error) {
  if (controller.signal.aborted) {
    console.log("Cancelled by user");
  } else {
    throw error;
  }
}
```

### Restrict allowed formats

By default, JPEG, PNG, WebP, HEIC, and HEIF are accepted. Narrow the list if your backend only supports certain types:

```typescript
import { normalizeImage } from "image-normalizer";

// Only JPEG and PNG — rejects HEIC, WebP, etc.
const result = await normalizeImage(file, {
  acceptedTypes: ["image/jpeg", "image/png"],
});
```

### iPhone HEIC photos

iOS often saves photos as HEIC even when the file extension looks like `.jpg`. The library detects the real type and converts HEIC/HEIF to JPEG before compression:

```typescript
import { normalizeImage } from "image-normalizer";

const result = await normalizeImage(iphonePhoto, {
  outputFormat: "image/jpeg",
  quality: 0.85,
});

// result.detectedMime → "image/heic" (what was actually in the file)
// result.file.type     → "image/jpeg" (what you upload)
// result.file.name     → "IMG_1234.jpg" (extension updated)
```

### Error handling

All errors extend `ImageNormalizerError` and expose a stable `code` for programmatic handling:

```typescript
import {
  normalizeImage,
  ImageNormalizerError,
  UnsupportedMimeError,
  UnknownFileTypeError,
  FileTooLargeError,
  HeicConversionError,
  CompressionError,
} from "image-normalizer";

try {
  await normalizeImage(file);
} catch (error) {
  if (error instanceof UnsupportedMimeError) {
    // User picked GIF, PDF, etc.
    console.log(error.code);           // "UNSUPPORTED_MIME"
    console.log(error.detectedMime);   // e.g. "image/gif"
    console.log(error.acceptedTypes);  // what you allowed
  } else if (error instanceof UnknownFileTypeError) {
    // Corrupted or unrecognized file
    console.log(error.fileName);
  } else if (error instanceof FileTooLargeError) {
    console.log(error.fileSize, error.maxFileSize);
  } else if (error instanceof HeicConversionError) {
    console.log(error.cause); // underlying conversion error
  } else if (error instanceof CompressionError) {
    console.log(error.cause);
  } else if (error instanceof ImageNormalizerError) {
    console.log(error.code, error.message);
  }
}
```

---

## API reference

### `normalizeImage(file, options?)`

Processes a `File` through the full normalization pipeline.

```typescript
function normalizeImage(
  file: File,
  options?: NormalizeImageOptions,
): Promise<NormalizeImageResult>;
```

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | `File` | User-selected image file |
| `options` | `NormalizeImageOptions` | Optional configuration (see below) |

**Returns:** `Promise<NormalizeImageResult>`

**Throws:** One of the [exported errors](#exported-errors) if validation or processing fails.

---

### `NormalizeImageOptions`

All fields are optional. Unset fields use the defaults shown.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `acceptedTypes` | `AcceptedImageMime[]` | `jpeg`, `png`, `webp`, `heic`, `heif` | Allowed input MIME types (detected from file content, not extension) |
| `maxFileSizeMB` | `number` | `10` | Maximum **original** file size in megabytes |
| `maxFileSize` | `number` | — | Maximum **original** file size in bytes. Overrides `maxFileSizeMB` when set |
| `outputFormat` | `OutputFormat` | `"image/jpeg"` | Desired output MIME type after compression |
| `quality` | `number` | `0.8` | Compression quality from `0` (lowest) to `1` (highest). Also used for HEIC → JPEG conversion |
| `maxWidthOrHeight` | `number` | `2048` | Maximum width **or** height in pixels (aspect ratio preserved) |
| `useWebWorker` | `boolean` | `true` | Run compression in a Web Worker (faster, non-blocking UI) |
| `signal` | `AbortSignal` | — | Pass an `AbortSignal` to cancel compression mid-process |

#### `acceptedTypes` values

```typescript
type AcceptedImageMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif";
```

#### `outputFormat` values

```typescript
type OutputFormat = "image/jpeg" | "image/png" | "image/webp";
```

#### Size limit notes

- Size is validated on the **original** file before any conversion or compression.
- Use `maxFileSize` for precise byte limits (e.g. `5 * 1024 * 1024` for 5 MB).
- Use `maxFileSizeMB` for readable config (e.g. `10` for 10 MB).

#### Quality notes

- `quality: 0.8` is a good balance for photos.
- PNG output ignores quality more aggressively than JPEG/WebP.
- Lower `maxWidthOrHeight` often reduces file size more than lowering quality.

---

### `NormalizeImageResult`

Object returned on success:

| Field | Type | Description |
| --- | --- | --- |
| `file` | `File` | New normalized file (original is untouched) |
| `detectedMime` | `string` | MIME type detected from magic bytes of the **original** file |
| `originalSize` | `number` | Size of the original file in bytes |
| `normalizedSize` | `number` | Size of the normalized file in bytes |

The returned `file`:

- Has its extension updated to match `outputFormat` (e.g. `photo.heic` → `photo.jpg`).
- Keeps the original `lastModified` timestamp.
- Has `type` set to your `outputFormat`.

---

### Exported types

```typescript
import type {
  AcceptedImageMime,
  NormalizeImageOptions,
  NormalizeImageResult,
  OutputFormat,
  ImageNormalizerErrorCode,
} from "image-normalizer";
```

| Type | Description |
| --- | --- |
| `AcceptedImageMime` | Union of allowed input MIME types |
| `OutputFormat` | Union of allowed output MIME types |
| `NormalizeImageOptions` | Options object for `normalizeImage` |
| `NormalizeImageResult` | Success result object |
| `ImageNormalizerErrorCode` | String literal union of all error codes |

---

### Exported errors

```typescript
import {
  ImageNormalizerError,
  UnsupportedMimeError,
  UnknownFileTypeError,
  FileTooLargeError,
  HeicConversionError,
  CompressionError,
} from "image-normalizer";
```

| Class | `code` | When it throws | Extra properties |
| --- | --- | --- | --- |
| `UnsupportedMimeError` | `UNSUPPORTED_MIME` | Detected type not in `acceptedTypes` | `detectedMime`, `acceptedTypes` |
| `UnknownFileTypeError` | `UNKNOWN_FILE_TYPE` | Magic bytes don't match any known type | `fileName` |
| `FileTooLargeError` | `FILE_TOO_LARGE` | Original file exceeds size limit | `fileSize`, `maxFileSize` |
| `HeicConversionError` | `HEIC_CONVERSION_FAILED` | HEIC/HEIF → JPEG conversion failed | `cause` |
| `CompressionError` | `COMPRESSION_FAILED` | Resize/compress step failed | `cause` |

All classes extend `ImageNormalizerError`, which extends `Error` and adds:

```typescript
class ImageNormalizerError extends Error {
  readonly code: ImageNormalizerErrorCode;
}
```

---

## How it works

Processing runs in a fixed pipeline. If any step fails, later steps are skipped and an error is thrown.

```
User File
    │
    ▼
┌─────────────────────┐
│ 1. Detect MIME      │  file-type (magic bytes)
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ 2. Validate type    │  against acceptedTypes
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ 3. Validate size    │  against maxFileSize
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ 4. Convert HEIC     │  heic-to (only if HEIC/HEIF)
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ 5. Compress/resize  │  browser-image-compression
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ 6. Build result     │  new File + metadata
└─────────────────────┘
```

**Important behaviors:**

- MIME detection uses file **content**, not the filename extension.
- HEIC/HEIF is converted to JPEG first; then `outputFormat` is applied during compression.
- EXIF metadata is **not** preserved (`preserveExif: false`).
- The input `File` is never mutated.

---

## Supported formats

### Input (detected from file content)

| MIME type | Notes |
| --- | --- |
| `image/jpeg` | Standard photos |
| `image/png` | Screenshots, graphics with transparency |
| `image/webp` | Modern web format |
| `image/heic` | Common on iPhones |
| `image/heif` | HEIF variant |

### Output (after normalization)

| MIME type | Extension |
| --- | --- |
| `image/jpeg` | `.jpg` |
| `image/png` | `.png` |
| `image/webp` | `.webp` |

GIF, SVG, BMP, and other formats are **not** supported as input.

---

## Content Security Policy

If `useWebWorker` is `true` (the default), compression runs in a Web Worker. Your CSP must allow:

```
script-src 'self' blob: https://cdn.jsdelivr.net;
```

| Directive | Why |
| --- | --- |
| `blob:` | Web Worker scripts are created from blob URLs |
| `https://cdn.jsdelivr.net` | Default CDN used by `browser-image-compression` for worker scripts |

To avoid the CDN requirement, disable workers:

```typescript
await normalizeImage(file, { useWebWorker: false });
```

Trade-off: compression runs on the main thread and may block UI on large images.

> HEIC conversion (`heic-to`) may require additional CSP rules in strict environments. Test with your production CSP before shipping.

---

## FAQ

### Does this work in Node.js or Next.js Server Actions?

No. This library is **browser-only**. In Next.js, call `normalizeImage` from a Client Component or inside `useEffect` / event handlers — not in Server Components or API routes.

### Why was my `.jpg` file rejected as HEIC?

iPhones often save photos as HEIC with a `.jpg` extension. The library reads magic bytes, not the extension, so it correctly detects `image/heic`. Conversion handles this automatically.

### Can I get a `Blob` instead of a `File`?

The result is always a `File`, but you can convert it:

```typescript
const { file } = await normalizeImage(input);
const blob = file.slice(0, file.size, file.type);
```

### Will the normalized file always be smaller?

Usually, but not guaranteed. Small or already-optimized images might end up similar in size or slightly larger after re-encoding. Check `originalSize` vs `normalizedSize`.

### Can I process multiple files?

Call `normalizeImage` once per file. For batches:

```typescript
const results = await Promise.all(
  Array.from(files).map((file) => normalizeImage(file)),
);
```

### What happens to EXIF data (GPS, orientation)?

EXIF is stripped during compression. This is intentional for privacy and consistency. If you need EXIF, this library is not the right tool.

---

## Development

```bash
git clone <repo-url>
cd image-normalizer
pnpm install

pnpm test          # run tests in watch mode
pnpm test:run      # single test run
pnpm test:coverage # with coverage report
pnpm build         # build dist/
pnpm typecheck     # TypeScript check
pnpm lint          # ESLint
pnpm format        # Prettier check
```

---

## License

MIT — see [LICENSE](./LICENSE).
