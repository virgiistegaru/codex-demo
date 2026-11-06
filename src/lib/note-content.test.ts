import { describe, expect, it } from "vitest";
import { parseTipTapDocument, serializeTipTapDocument } from "@/src/lib/note-content";

function serialize(content: unknown): string {
  return JSON.stringify(content);
}

function nestedBlockquotes(depth: number): Record<string, unknown> {
  let node: Record<string, unknown> = {
    type: "blockquote",
    content: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }],
  };

  for (let index = 1; index < depth; index += 1) {
    node = { type: "blockquote", content: [node] };
  }

  return node;
}

describe("parseTipTapDocument", () => {
  it("accepts supported blocks and inline marks", () => {
    const result = parseTipTapDocument(
      serialize({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              { type: "text", text: "Important", marks: [{ type: "bold" }, { type: "italic" }] },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Read this",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "https://example.com/path", target: "_blank" },
                  },
                ],
              },
              { type: "hardBreak" },
            ],
          },
          {
            type: "bulletList",
            content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
          },
          { type: "codeBlock", content: [{ type: "text", text: "const answer = 42" }] },
          { type: "horizontalRule" },
        ],
      }),
    );

    expect(result).not.toBeNull();
    expect(result?.content?.[0]).toEqual({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Important", marks: [{ type: "bold" }, { type: "italic" }] }],
    });
    expect(result?.content?.[1].content?.[0]).toEqual({
      type: "text",
      text: "Read this",
      marks: [{ type: "link", attrs: { href: "https://example.com/path" } }],
    });
  });

  it.each(["not-json", "null", "[]", "{}", '{"type":"paragraph"}'])(
    "rejects malformed or non-document JSON: %s",
    (input) => {
      expect(parseTipTapDocument(input)).toBeNull();
    },
  );

  it.each([
    { type: "doc", content: [] },
    { type: "doc", content: [{ type: "text", text: "outside a block" }] },
    { type: "doc", content: [{ type: "paragraph", content: [{ type: "image" }] }] },
    { type: "doc", content: [{ type: "heading", attrs: { level: 4 }, content: [] }] },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x", marks: [{ type: "script" }] }],
        },
      ],
    },
  ])("rejects invalid document structures", (document) => {
    expect(parseTipTapDocument(serialize(document))).toBeNull();
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://user:pass@example.com",
    "/relative",
  ])("rejects unsafe link href %s", (href) => {
    const document = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "unsafe", marks: [{ type: "link", attrs: { href } }] }],
        },
      ],
    };

    expect(parseTipTapDocument(serialize(document))).toBeNull();
  });

  it("rejects content exceeding the 256 KB limit", () => {
    const document = serialize({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(256 * 1024) }] }],
    });

    expect(parseTipTapDocument(document)).toBeNull();
  });

  it("rejects excessively deep nested blocks", () => {
    expect(
      parseTipTapDocument(serialize({ type: "doc", content: [nestedBlockquotes(34)] })),
    ).toBeNull();
  });
});

describe("serializeTipTapDocument", () => {
  it("returns normalized JSON for a valid document", () => {
    const input = serialize({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "linked",
              marks: [{ type: "link", attrs: { href: "http://example.com", rel: "evil" } }],
            },
          ],
        },
      ],
    });

    expect(serializeTipTapDocument(input)).toBe(
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"linked","marks":[{"type":"link","attrs":{"href":"http://example.com/"}}]}]}]}',
    );
  });

  it("returns null for invalid content", () => {
    expect(serializeTipTapDocument('{"type":"doc","content":[]}')).toBeNull();
  });
});
