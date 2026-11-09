import { describe, expect, it } from "vitest";
import { renderTipTapHtml } from "@/src/lib/note-html";

function documentWith(content: unknown[]): string {
  return JSON.stringify({ type: "doc", content });
}

describe("renderTipTapHtml", () => {
  it("renders supported rich text blocks and marks", () => {
    const html = renderTipTapHtml(
      documentWith([
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Heading" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold", marks: [{ type: "bold" }] },
            { type: "hardBreak" },
            { type: "text", text: "Italic", marks: [{ type: "italic" }] },
            { type: "text", text: "Underline", marks: [{ type: "underline" }] },
            { type: "text", text: "Strike", marks: [{ type: "strike" }] },
            { type: "text", text: "code", marks: [{ type: "code" }] },
          ],
        },
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
        },
        {
          type: "orderedList",
          content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
        },
        { type: "blockquote", content: [{ type: "paragraph" }] },
        { type: "codeBlock", content: [{ type: "text", text: "a < b && b > c" }] },
        { type: "horizontalRule" },
      ]),
    );

    expect(html).toBe(
      "<h2>Heading</h2><p><strong>Bold</strong><br><em>Italic</em><u>Underline</u><s>Strike</s><code>code</code></p><ul><li><p></p></li></ul><ol><li><p></p></li></ol><blockquote><p></p></blockquote><pre><code>a &lt; b &amp;&amp; b &gt; c</code></pre><hr>",
    );
  });

  it("escapes HTML in text instead of creating elements", () => {
    const html = renderTipTapHtml(
      documentWith([
        {
          type: "paragraph",
          content: [{ type: "text", text: '<script>alert("x")</script><img onerror=alert(1)>' }],
        },
      ]),
    );

    expect(html).toBe(
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&lt;img onerror=alert(1)&gt;</p>",
    );
  });

  it("escapes link attributes and discards caller-supplied HTML attributes", () => {
    const html = renderTipTapHtml(
      documentWith([
        {
          type: "paragraph",
          attrs: { onclick: "alert(1)" },
          content: [
            {
              type: "text",
              text: "Safe link",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://example.com/?a=1&b=2",
                    onclick: "alert(1)",
                    target: "evil",
                    rel: "opener",
                  },
                },
              ],
            },
          ],
        },
      ]),
    );

    expect(html).toBe(
      '<p><a href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">Safe link</a></p>',
    );
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "/relative"])(
    "rejects an unsafe stored link: %s",
    (href) => {
      expect(
        renderTipTapHtml(
          documentWith([
            {
              type: "paragraph",
              content: [{ type: "text", text: "Link", marks: [{ type: "link", attrs: { href } }] }],
            },
          ]),
        ),
      ).toBeNull();
    },
  );

  it.each(["not-json", documentWith([{ type: "script", content: [] }])])(
    "rejects malformed or unsupported stored content",
    (content) => {
      expect(renderTipTapHtml(content)).toBeNull();
    },
  );
});
