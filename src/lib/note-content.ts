import type { JSONContent } from "@tiptap/core";

const MAX_CONTENT_BYTES = 256 * 1024;
const MAX_NODES = 20_000;
const MAX_DEPTH = 32;

type JsonObject = Record<string, unknown>;
type NormalizedMark = { type: string; attrs?: Record<string, string> };

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeMark(value: unknown): NormalizedMark | null {
  if (!isObject(value) || typeof value.type !== "string") return null;

  if (["bold", "italic", "underline", "strike", "code"].includes(value.type)) {
    return { type: value.type };
  }

  if (value.type === "link" && isObject(value.attrs)) {
    const href = normalizeHref(value.attrs.href);
    return href ? { type: "link", attrs: { href } } : null;
  }

  return null;
}

function normalizeNode(
  value: unknown,
  depth: number,
  counter: { count: number },
): JSONContent | null {
  if (!isObject(value) || depth > MAX_DEPTH || typeof value.type !== "string") return null;
  counter.count += 1;
  if (counter.count > MAX_NODES) return null;

  if (value.type === "text") {
    if (typeof value.text !== "string" || value.text.length === 0) return null;
    if (value.marks !== undefined && !Array.isArray(value.marks)) return null;
    const marks: NormalizedMark[] = [];
    if (Array.isArray(value.marks)) {
      for (const mark of value.marks) {
        const normalizedMark = normalizeMark(mark);
        if (!normalizedMark) return null;
        marks.push(normalizedMark);
      }
    }
    return { type: "text", text: value.text, ...(marks.length ? { marks } : {}) };
  }

  if (value.type === "hardBreak" || value.type === "horizontalRule") {
    return { type: value.type };
  }

  const allowedContainers = [
    "doc",
    "paragraph",
    "heading",
    "blockquote",
    "bulletList",
    "orderedList",
    "listItem",
    "codeBlock",
  ];
  if (!allowedContainers.includes(value.type)) return null;
  if (value.type === "doc" && !Array.isArray(value.content)) return null;
  if (value.content !== undefined && !Array.isArray(value.content)) return null;

  const content: JSONContent[] = [];
  if (Array.isArray(value.content)) {
    for (const child of value.content) {
      const normalizedChild = normalizeNode(child, depth + 1, counter);
      if (!normalizedChild) return null;
      content.push(normalizedChild);
    }
  }

  if (value.type === "heading") {
    const level = isObject(value.attrs) ? value.attrs.level : undefined;
    if (level !== 1 && level !== 2 && level !== 3) return null;
    return { type: "heading", attrs: { level }, content };
  }

  return { type: value.type, content };
}

export function parseTipTapDocument(serialized: string): JSONContent | null {
  if (new TextEncoder().encode(serialized).byteLength > MAX_CONTENT_BYTES) return null;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isObject(parsed) || parsed.type !== "doc") return null;
    const document = normalizeNode(parsed, 0, { count: 0 });
    return document?.type === "doc" && hasValidStructure(document) ? document : null;
  } catch {
    return null;
  }
}

function hasValidStructure(node: JSONContent): boolean {
  const children = node.content ?? [];
  const allBlocks = children.every((child) =>
    [
      "paragraph",
      "heading",
      "blockquote",
      "bulletList",
      "orderedList",
      "codeBlock",
      "horizontalRule",
    ].includes(child.type ?? ""),
  );

  switch (node.type) {
    case "doc":
      return children.length > 0 && allBlocks && children.every(hasValidStructure);
    case "paragraph":
    case "heading":
      return children.every((child) => child.type === "text" || child.type === "hardBreak");
    case "codeBlock":
      return children.every((child) => child.type === "text");
    case "blockquote":
      return children.length > 0 && allBlocks && children.every(hasValidStructure);
    case "bulletList":
    case "orderedList":
      return (
        children.length > 0 &&
        children.every((child) => child.type === "listItem" && hasValidStructure(child))
      );
    case "listItem":
      return children.length > 0 && allBlocks && children.every(hasValidStructure);
    case "text":
    case "hardBreak":
    case "horizontalRule":
      return true;
    default:
      return false;
  }
}

export function serializeTipTapDocument(serialized: string): string | null {
  const document = parseTipTapDocument(serialized);
  return document ? JSON.stringify(document) : null;
}

export const EMPTY_NOTE_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
