# image-normalizer

TypeScript library for preprocessing and normalizing images in web applications.

Receive any user-selected image (Android, iPhone, desktop), validate it, normalize it, and return an optimized, safe file ready for upload or storage — behind a single API.

## Install

```bash
pnpm add image-normalizer
# or
npm install image-normalizer
```

## Usage

```typescript
import { normalizeImage } from "image-normalizer";

const input = document.querySelector<HTMLInputElement>("#photo");

input?.addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const result = await normalizeImage(file, {
      acceptedTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ],
      maxFileSizeMB: 10,
      maxWidthOrHeight: 2048,
      quality: 0.8,
      outputFormat: "image/jpeg",
    });

    await uploadToServer(result.file);
  } catch (error) {
    console.error(error);
  }
});
```

## API

### `normalizeImage(file, options?)`

Processes a `File` through the normalization pipeline and returns a new optimized `File`. The original file is never modified.

**Returns:** `Promise<NormalizeImageResult>`

| Field | Type | Description |
| --- | --- | --- |
| `file` | `File` | Normalized output file |
| `detectedMime` | `string` | MIME type detected from magic bytes |
| `originalSize` | `number` | Original file size in bytes |
| `normalizedSize` | `number` | Output file size in bytes |

### Options (v1)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `acceptedTypes` | `string[]` | `jpeg`, `png`, `webp`, `heic`, `heif` | Allowed input MIME types |
| `maxFileSizeMB` | `number` | `10` | Max original file size in MB |
| `maxFileSize` | `number` | — | Max original file size in bytes (overrides `maxFileSizeMB`) |
| `outputFormat` | `"image/jpeg" \| "image/png" \| "image/webp"` | `"image/jpeg"` | Desired output format |
| `quality` | `number` | `0.8` | Compression quality (0–1) |
| `maxWidthOrHeight` | `number` | `2048` | Max width or height in pixels |
| `useWebWorker` | `boolean` | `true` | Use web worker for compression |
| `signal` | `AbortSignal` | — | Abort compression |

## Supported formats

**Input:** `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`

**Output:** `image/jpeg`, `image/png`, `image/webp`

## Processing pipeline

1. Detect real MIME type via magic bytes (`file-type`)
2. Validate allowed type
3. Validate max file size
4. Convert HEIC/HEIF to JPEG if needed (`heic-to`)
5. Compress and resize (`browser-image-compression`)
6. Return a new normalized `File`

## Errors

All errors extend `ImageNormalizerError` and expose a stable `code`:

| Error | Code |
| --- | --- |
| `UnsupportedMimeError` | `UNSUPPORTED_MIME` |
| `UnknownFileTypeError` | `UNKNOWN_FILE_TYPE` |
| `FileTooLargeError` | `FILE_TOO_LARGE` |
| `HeicConversionError` | `HEIC_CONVERSION_FAILED` |
| `CompressionError` | `COMPRESSION_FAILED` |

## Content Security Policy

If using web workers for compression (`useWebWorker: true`, default), add to your CSP:

```
script-src 'self' blob: https://cdn.jsdelivr.net
```

- `blob:` — required for web worker scripts
- `https://cdn.jsdelivr.net` — default CDN used by `browser-image-compression` workers

For strict CSP with HEIC conversion, you may need the CSP-compatible build of `heic-to` in a future version.

## Development

```bash
pnpm install
pnpm test
pnpm build
pnpm typecheck
```

## License

MIT
