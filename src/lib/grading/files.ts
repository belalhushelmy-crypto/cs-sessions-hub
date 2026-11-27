import "server-only";
import type { GradingAttachment } from "./schema";
import { fileExtension, isTextFile, mimeForExtension } from "@/lib/validation";

/** Keeps prompts bounded while still reading full notebooks in normal use. */
const MAX_TEXT_CHARS = 200_000;

function cellText(value: unknown): string {
  if (Array.isArray(value)) return value.map((part) => String(part ?? "")).join("");
  return value === null || value === undefined ? "" : String(value);
}

type NotebookCell = {
  cell_type?: string;
  source?: unknown;
  outputs?: Array<{
    output_type?: string;
    text?: unknown;
    data?: Record<string, unknown>;
    ename?: string;
    evalue?: string;
    traceback?: unknown;
  }>;
};

/** Extracts code, markdown and cell outputs from a .ipynb into readable text. */
export function parseNotebook(source: string): string {
  const clip = (value: string) =>
    value.length > MAX_TEXT_CHARS ? `${value.slice(0, MAX_TEXT_CHARS)}\n[truncated]` : value;

  let notebook: { cells?: NotebookCell[] };
  try {
    notebook = JSON.parse(source) as { cells?: NotebookCell[] };
  } catch {
    return "[Notebook could not be parsed as JSON]";
  }

  const sections: string[] = [];
  for (const cell of notebook.cells ?? []) {
    const text = cellText(cell.source);
    if (cell.cell_type === "markdown") {
      sections.push(`--- markdown cell ---\n${text}`);
      continue;
    }
    if (cell.cell_type !== "code") continue;

    sections.push(`--- code cell ---\n\`\`\`python\n${text}\n\`\`\``);
    for (const output of cell.outputs ?? []) {
      if (output.output_type === "error") {
        sections.push(
          `cell error: ${output.ename ?? "Error"}: ${output.evalue ?? ""}\n${cellText(output.traceback)}`,
        );
        continue;
      }
      const plain = output.data?.["text/plain"];
      if (plain !== undefined) {
        sections.push(`cell output: ${cellText(plain)}`);
      } else if (typeof output.text === "string" || Array.isArray(output.text)) {
        sections.push(`cell output: ${cellText(output.text)}`);
      }
      for (const [mime, value] of Object.entries(output.data ?? {})) {
        if (mime === "text/plain") continue;
        if (mime.startsWith("image/") || mime === "application/pdf") {
          sections.push(`cell output [${mime}, ${cellText(value).length} base64 chars]`);
        }
      }
    }
  }

  return clip(sections.join("\n\n")) || "[Notebook has no cells]";
}

export type ParsedFile = {
  text: string;
  attachment?: GradingAttachment;
};

/** Reads any supported file into grader text (+ inline data for binary files). */
export function parseFileForGrading(
  bytes: Uint8Array,
  path: string,
): ParsedFile {
  const extension = fileExtension(path);
  const name = path.split("/").pop() ?? path;

  if (extension === ".ipynb") {
    return { text: parseNotebook(new TextDecoder("utf-8").decode(bytes)) };
  }
  if (isTextFile(extension)) {
    return { text: new TextDecoder("utf-8").decode(bytes).slice(0, MAX_TEXT_CHARS) };
  }

  return {
    text: `[Attached file: ${name}]`,
    attachment: {
      name,
      mimeType: mimeForExtension(extension),
      data: Buffer.from(bytes).toString("base64"),
    },
  };
}
