import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import bash from "highlight.js/lib/languages/bash";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/github-dark.min.css";
import {
  normalizeImage,
  UnsupportedMimeError,
  UnknownFileTypeError,
  FileTooLargeError,
  HeicConversionError,
  CompressionError,
  ImageNormalizerError,
} from "image-normalizer";
import type {
  AcceptedImageMime,
  NormalizeImageOptions,
  NormalizeImageResult,
  OutputFormat,
} from "image-normalizer";
import readme from "../README.md?raw";
import "./styles.css";

// ── DOM refs ────────────────────────────────────────────────────────────────

const dropZone = document.querySelector<HTMLElement>("#drop-zone")!;
const fileInput = document.querySelector<HTMLInputElement>("#file-input")!;
const processBtn = document.querySelector<HTMLButtonElement>("#process-btn")!;
const cancelBtn = document.querySelector<HTMLButtonElement>("#cancel-btn")!;
const statusBar = document.querySelector<HTMLElement>("#status-bar")!;
const errorPanel = document.querySelector<HTMLElement>("#error-panel")!;
const resultsEl = document.querySelector<HTMLElement>("#results")!;
const pipelineSteps = document.querySelectorAll<HTMLElement>(".pipeline-step");

const outputFormatSelect =
  document.querySelector<HTMLSelectElement>("#output-format")!;
const qualityInput = document.querySelector<HTMLInputElement>("#quality")!;
const qualityValue = document.querySelector<HTMLElement>("#quality-value")!;
const maxDimensionInput =
  document.querySelector<HTMLInputElement>("#max-dimension")!;
const maxSizeMbInput = document.querySelector<HTMLInputElement>("#max-size-mb")!;
const useExactBytesCheckbox =
  document.querySelector<HTMLInputElement>("#use-exact-bytes")!;
const maxSizeBytesInput =
  document.querySelector<HTMLInputElement>("#max-size-bytes")!;
const useWebWorkerCheckbox =
  document.querySelector<HTMLInputElement>("#use-web-worker")!;
const acceptedTypesContainer =
  document.querySelector<HTMLElement>("#accepted-types")!;

// ── State ───────────────────────────────────────────────────────────────────

let selectedFiles: File[] = [];
let abortController: AbortController | null = null;
const previewUrls: string[] = [];
const normalizedFiles: File[] = [];

// ── Pipeline animation ──────────────────────────────────────────────────────

const PIPELINE_SEQUENCE = [
  "detect",
  "validate",
  "size",
  "heic",
  "compress",
  "result",
] as const;

type PipelineStep = (typeof PIPELINE_SEQUENCE)[number];

let pipelineTimers: ReturnType<typeof setTimeout>[] = [];

function resetPipeline(): void {
  pipelineTimers.forEach(clearTimeout);
  pipelineTimers = [];
  pipelineSteps.forEach((step) => {
    step.classList.remove("active", "done");
  });
}

function animatePipeline(detectedMime: string): void {
  resetPipeline();

  const isHeic =
    detectedMime === "image/heic" || detectedMime === "image/heif";

  const stepsToRun: PipelineStep[] = isHeic
    ? [...PIPELINE_SEQUENCE]
    : PIPELINE_SEQUENCE.filter((s) => s !== "heic");

  const delayMs = 350;

  stepsToRun.forEach((stepName, index) => {
    const timer = setTimeout(() => {
      pipelineSteps.forEach((el) => {
        if (el.dataset.step === stepName) {
          el.classList.add("active");
        }
      });

      if (index > 0) {
        const prevStep = stepsToRun[index - 1];
        pipelineSteps.forEach((el) => {
          if (el.dataset.step === prevStep) {
            el.classList.remove("active");
            el.classList.add("done");
          }
        });
      }
    }, index * delayMs);
    pipelineTimers.push(timer);
  });
}

function finishPipeline(): void {
  pipelineTimers.forEach(clearTimeout);
  pipelineTimers = [];
  pipelineSteps.forEach((step) => {
    step.classList.remove("active");
    step.classList.add("done");
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getAcceptedTypes(): AcceptedImageMime[] {
  const checkboxes = acceptedTypesContainer.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]:checked',
  );
  return Array.from(checkboxes).map(
    (cb) => cb.value as AcceptedImageMime,
  );
}

function getOptions(signal?: AbortSignal): NormalizeImageOptions {
  const options: NormalizeImageOptions = {
    outputFormat: outputFormatSelect.value as OutputFormat,
    quality: parseFloat(qualityInput.value),
    maxWidthOrHeight: parseInt(maxDimensionInput.value, 10),
    useWebWorker: useWebWorkerCheckbox.checked,
  };

  const accepted = getAcceptedTypes();
  if (accepted.length > 0) {
    options.acceptedTypes = accepted;
  }

  if (useExactBytesCheckbox.checked) {
    options.maxFileSize = parseInt(maxSizeBytesInput.value, 10);
  } else {
    options.maxFileSizeMB = parseFloat(maxSizeMbInput.value);
  }

  if (signal) {
    options.signal = signal;
  }

  return options;
}

function revokePreviewUrls(): void {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls.length = 0;
  normalizedFiles.length = 0;
}

function setStatus(
  message: string,
  variant: "idle" | "processing" | "success" = "idle",
): void {
  statusBar.textContent = message;
  statusBar.className = "status-bar";
  if (variant !== "idle") {
    statusBar.classList.add(variant);
  }
}

function hideError(): void {
  errorPanel.hidden = true;
  errorPanel.innerHTML = "";
}

function showError(error: unknown): void {
  if (error instanceof DOMException && error.name === "AbortError") {
    setStatus("Processing cancelled.");
    return;
  }

  if (abortController?.signal.aborted) {
    setStatus("Processing cancelled.");
    return;
  }

  let html = "";

  if (error instanceof UnsupportedMimeError) {
    html = buildErrorHtml(error.code, error.message, {
      detectedMime: error.detectedMime,
      acceptedTypes: error.acceptedTypes.join(", "),
    });
  } else if (error instanceof UnknownFileTypeError) {
    html = buildErrorHtml(error.code, error.message, {
      fileName: error.fileName,
    });
  } else if (error instanceof FileTooLargeError) {
    html = buildErrorHtml(error.code, error.message, {
      fileSize: formatBytes(error.fileSize),
      maxFileSize: formatBytes(error.maxFileSize),
    });
  } else if (error instanceof HeicConversionError) {
    html = buildErrorHtml(error.code, error.message, {
      cause: String(error.cause ?? "unknown"),
    });
  } else if (error instanceof CompressionError) {
    html = buildErrorHtml(error.code, error.message, {
      cause: String(error.cause ?? "unknown"),
    });
  } else if (error instanceof ImageNormalizerError) {
    html = buildErrorHtml(error.code, error.message, {});
  } else if (error instanceof Error) {
    html = buildErrorHtml("UNKNOWN", error.message, {});
  } else {
    html = buildErrorHtml("UNKNOWN", "An unexpected error occurred.", {});
  }

  errorPanel.innerHTML = html;
  errorPanel.hidden = false;
  setStatus("Processing failed.");
}

function buildErrorHtml(
  code: string,
  message: string,
  extras: Record<string, string>,
): string {
  const extraEntries = Object.entries(extras)
    .map(([key, value]) => `<dt>${key}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");

  return `
    <div class="error-code">${escapeHtml(code)}</div>
    <p>${escapeHtml(message)}</p>
    ${extraEntries ? `<dl>${extraEntries}</dl>` : ""}
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderResult(
  originalFile: File,
  result: NormalizeImageResult,
  index: number,
): string {
  const originalUrl = URL.createObjectURL(originalFile);
  const normalizedUrl = URL.createObjectURL(result.file);
  previewUrls.push(originalUrl, normalizedUrl);
  normalizedFiles[index] = result.file;

  const savings = (1 - result.normalizedSize / result.originalSize) * 100;
  const savingsClass =
    savings > 0 ? "savings-positive" : "savings-negative";
  const savingsLabel =
    savings > 0
      ? `${savings.toFixed(0)}% smaller`
      : savings < 0
        ? `${Math.abs(savings).toFixed(0)}% larger`
        : "same size";

  return `
    <article class="result-card" data-index="${index}">
      <h3>${escapeHtml(originalFile.name)}</h3>
      <div class="preview-row">
        <figure class="preview-box">
          <figcaption>Original</figcaption>
          <img src="${originalUrl}" alt="Original ${escapeHtml(originalFile.name)}" />
        </figure>
        <figure class="preview-box">
          <figcaption>Normalized</figcaption>
          <img src="${normalizedUrl}" alt="Normalized ${escapeHtml(result.file.name)}" />
        </figure>
      </div>
      <dl class="stats-grid">
        <dt>detectedMime</dt>
        <dd>${escapeHtml(result.detectedMime)}</dd>
        <dt>output type</dt>
        <dd>${escapeHtml(result.file.type)}</dd>
        <dt>originalSize</dt>
        <dd>${formatBytes(result.originalSize)}</dd>
        <dt>normalizedSize</dt>
        <dd>${formatBytes(result.normalizedSize)}</dd>
        <dt>savings</dt>
        <dd class="${savingsClass}">${savingsLabel}</dd>
        <dt>file.name</dt>
        <dd>${escapeHtml(result.file.name)}</dd>
      </dl>
      <button
        class="btn btn-secondary btn-download"
        type="button"
        data-download="${index}"
      >
        Download normalized file
      </button>
    </article>
  `;
}

// ── Processing ──────────────────────────────────────────────────────────────

async function processFiles(): Promise<void> {
  if (selectedFiles.length === 0) return;

  hideError();
  revokePreviewUrls();
  resultsEl.innerHTML = "";

  abortController = new AbortController();
  processBtn.disabled = true;
  cancelBtn.hidden = false;
  setStatus(
    `Processing ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}…`,
    "processing",
  );

  resetPipeline();

  const options = getOptions(abortController.signal);
  const normalizedResults: NormalizeImageResult[] = [];

  try {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]!;
      setStatus(
        `Processing ${i + 1}/${selectedFiles.length}: ${file.name}…`,
        "processing",
      );

      animatePipeline("image/jpeg");

      const result = await normalizeImage(file, options);
      normalizedResults.push(result);
      finishPipeline();

      const cardHtml = renderResult(file, result, i);
      resultsEl.insertAdjacentHTML("beforeend", cardHtml);
    }

    setStatus(
      `Done — ${normalizedResults.length} file${normalizedResults.length > 1 ? "s" : ""} normalized.`,
      "success",
    );
  } catch (error) {
    resetPipeline();
    showError(error);
  } finally {
    abortController = null;
    processBtn.disabled = selectedFiles.length === 0;
    cancelBtn.hidden = true;
  }
}

// ── File selection ────────────────────────────────────────────────────────────

function handleFiles(files: FileList | File[]): void {
  selectedFiles = Array.from(files);
  processBtn.disabled = selectedFiles.length === 0;

  if (selectedFiles.length === 0) {
    setStatus("Select one or more images to begin.");
    return;
  }

  setStatus(
    `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected — click Normalize or drop again to replace.`,
  );
}

// ── Event listeners ───────────────────────────────────────────────────────────

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer?.files.length) {
    handleFiles(e.dataTransfer.files);
  }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files?.length) {
    handleFiles(fileInput.files);
  }
});

processBtn.addEventListener("click", () => {
  void processFiles();
});

cancelBtn.addEventListener("click", () => {
  abortController?.abort();
  setStatus("Cancelling…", "processing");
});

qualityInput.addEventListener("input", () => {
  qualityValue.textContent = parseFloat(qualityInput.value).toFixed(2);
});

useExactBytesCheckbox.addEventListener("change", () => {
  const useBytes = useExactBytesCheckbox.checked;
  maxSizeBytesInput.disabled = !useBytes;
  maxSizeMbInput.disabled = useBytes;
});

resultsEl.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const downloadIndex = target.dataset.download;
  if (downloadIndex === undefined) return;

  const index = parseInt(downloadIndex, 10);
  const file = normalizedFiles[index];
  if (!file) return;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(link.href);
});

// ── README rendering ────────────────────────────────────────────────────────

const LANG_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  sh: "bash",
};

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);

marked.use(
  markedHighlight({
    async: false,
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = LANG_ALIASES[lang] ?? lang;
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value;
      }
      return escapeHtml(code);
    },
  }),
);

function renderReadme(): void {
  const readmeEl = document.querySelector<HTMLElement>("#readme-content")!;
  marked.setOptions({
    gfm: true,
    breaks: false,
  });
  readmeEl.innerHTML = marked.parse(readme) as string;

  readmeEl.querySelectorAll("a[href^='#']").forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      const id = anchor.getAttribute("href")!.slice(1);
      const target = readmeEl.querySelector(`[id="${id}"]`);
      target?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

renderReadme();
