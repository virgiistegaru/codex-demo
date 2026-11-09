import type { JSONContent } from "@tiptap/core";
import { parseTipTapDocument } from "@/src/lib/note-content";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function renderNode(node: JSONContent): string {
  if (node.type === "text") {
    let html = escapeHtml(node.text ?? "");
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold":
          html = `<strong>${html}</strong>`;
          break;
        case "italic":
          html = `<em>${html}</em>`;
          break;
        case "underline":
          html = `<u>${html}</u>`;
          break;
        case "strike":
          html = `<s>${html}</s>`;
          break;
        case "code":
          html = `<code>${html}</code>`;
          break;
        case "link":
          html = `<a href="${escapeHtml(mark.attrs?.href ?? "")}" target="_blank" rel="noopener noreferrer">${html}</a>`;
          break;
      }
    }
    return html;
  }

  const children = (node.content ?? []).map(renderNode).join("");
  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading":
      // parseTipTapDocument limits heading levels to 1, 2, or 3.
      return `<h${node.attrs?.level}>${children}</h${node.attrs?.level}>`;
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "codeBlock":
      return `<pre><code>${children}</code></pre>`;
    default:
      return "";
  }
}

/**
 * Sanitize by construction: normalize the stored document, then emit only fixed
 * allowlisted tags and link attributes. Every text/attribute value is escaped;
 * the normalizer permits only absolute http/https links without credentials.
 */
export function renderTipTapHtml(serialized: string): string | null {
  const document = parseTipTapDocument(serialized);
  return document ? renderNode(document) : null;
}
