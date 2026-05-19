import { describe, it, expect } from "vitest";
import {
  tokenize,
  OPEN_TAG_TOKEN,
  CLOSE_TAG_TOKEN,
  SLASH_TOKEN,
  IDENTIFIER_TOKEN,
  EQUALS_TOKEN,
  QUOTED_STRING_TOKEN,
  TEXT_TOKEN,
  EXPRESSION_TOKEN,
  SPREAD_TOKEN,
  COMMENT_START_TOKEN,
  COMMENT_END_TOKEN,
  IdentifierToken,
  SpreadToken,
} from "../src/index";

function tokenizeTemplate(strings: TemplateStringsArray, ...values: any[]) {
  return tokenize(strings);
}

describe("basic tags", () => {
  it("should tokenize opening tag", () => {
    const tokens = tokenizeTemplate`<div`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
    ]);
  });

  it("should tokenize complete tag", () => {
    const tokens = tokenizeTemplate`<div>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 4, end: 5 },
    ]);
  });

  it("should tokenize self-closing tag", () => {
    const tokens = tokenizeTemplate`<div />`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: SLASH_TOKEN, segment: 0, start: 5, end: 6 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 6, end: 7 },
    ]);
  });

  it("should tokenize opening and closing tag", () => {
    const tokens = tokenizeTemplate`<div></div>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 4, end: 5 },
      { type: OPEN_TAG_TOKEN, segment: 0, start: 5, end: 6 },
      { type: SLASH_TOKEN, segment: 0, start: 6, end: 7 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 7, end: 10 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 10, end: 11 },
    ]);
  });
});

describe("attribute values", () => {
  it("should tokenize quoted string", () => {
    const tokens = tokenizeTemplate`<div id="hello">`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: IDENTIFIER_TOKEN, value: "id", segment: 0, start: 5, end: 7 },
      { type: EQUALS_TOKEN, segment: 0, start: 7, end: 8 },
      {
        type: QUOTED_STRING_TOKEN,
        value: "hello",
        quote: '"',
        segment: 0,
        start: 8,
        end: 15,
      },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 15, end: 16 },
    ]);
  });

  it("should tokenize single quoted string", () => {
    const tokens = tokenizeTemplate`<div id='hello'>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: IDENTIFIER_TOKEN, value: "id", segment: 0, start: 5, end: 7 },
      { type: EQUALS_TOKEN, segment: 0, start: 7, end: 8 },
      {
        type: QUOTED_STRING_TOKEN,
        value: "hello",
        quote: "'",
        segment: 0,
        start: 8,
        end: 15,
      },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 15, end: 16 },
    ]);
  });

  it("should handle empty quoted string", () => {
    const tokens = tokenizeTemplate`<div class="">`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: IDENTIFIER_TOKEN, value: "class", segment: 0, start: 5, end: 10 },
      { type: EQUALS_TOKEN, segment: 0, start: 10, end: 11 },
      {
        type: QUOTED_STRING_TOKEN,
        value: "",
        quote: '"',
        segment: 0,
        start: 11,
        end: 13,
      },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 13, end: 14 },
    ]);
  });

  it("should handle boolean like attribute", () => {
    const tokens = tokenizeTemplate`<div enabled bool>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      {
        type: IDENTIFIER_TOKEN,
        value: "enabled",
        segment: 0,
        start: 5,
        end: 12,
      },
      { type: IDENTIFIER_TOKEN, value: "bool", segment: 0, start: 13, end: 17 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 17, end: 18 },
    ]);
  });

  it("should handle deeply nested quotes", () => {
    const tokens = tokenizeTemplate`<div data="value with 'nested' quotes">`;

    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: QUOTED_STRING_TOKEN,
        value: "value with 'nested' quotes",
      }),
    );
  });

  it("should handle attribute values with special characters", () => {
    const tokens = tokenizeTemplate`<div data="!@#$%^&*()_+-=[]{}|;:,.<>?">`;

    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: QUOTED_STRING_TOKEN,
        value: "!@#$%^&*()_+-=[]{}|;:,.<>?",
      }),
    );
  });

  it("should handle empty attribute values", () => {
    const tokens = tokenizeTemplate`<div attr="">`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: IDENTIFIER_TOKEN, value: "attr", segment: 0, start: 5, end: 9 },
      { type: EQUALS_TOKEN, segment: 0, start: 9, end: 10 },
      {
        type: QUOTED_STRING_TOKEN,
        value: "",
        quote: '"',
        segment: 0,
        start: 10,
        end: 12,
      },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 12, end: 13 },
    ]);
  });

  it("should handle URL-like attribute values", () => {
    const tokens = tokenizeTemplate`<a href="https://example.com/path?query=value&other=test#section">`;

    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: QUOTED_STRING_TOKEN,
        value: "https://example.com/path?query=value&other=test#section",
      }),
    );
  });

  it("attribute name doesnt trigger raw text", () => {
    const tokens = tokenizeTemplate`
            <h1 title=""></h1>
          `;

    expect(tokens).toEqual([
      {
        type: TEXT_TOKEN,
        value: "\n            ",
        segment: 0,
        start: 0,
        end: 13,
      },
      { type: OPEN_TAG_TOKEN, segment: 0, start: 13, end: 14 },
      { type: IDENTIFIER_TOKEN, value: "h1", segment: 0, start: 14, end: 16 },
      {
        type: IDENTIFIER_TOKEN,
        value: "title",
        segment: 0,
        start: 17,
        end: 22,
      },
      { type: EQUALS_TOKEN, segment: 0, start: 22, end: 23 },
      {
        type: QUOTED_STRING_TOKEN,
        value: "",
        quote: '"',
        segment: 0,
        start: 23,
        end: 25,
      },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 25, end: 26 },
      { type: OPEN_TAG_TOKEN, segment: 0, start: 26, end: 27 },
      { type: SLASH_TOKEN, segment: 0, start: 27, end: 28 },
      { type: IDENTIFIER_TOKEN, value: "h1", segment: 0, start: 28, end: 30 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 30, end: 31 },
      {
        type: TEXT_TOKEN,
        value: "\n          ",
        segment: 0,
        start: 31,
        end: 42,
      },
    ]);
  });
});

describe("expressions", () => {
  it("should tokenize simple expression", () => {
    const value = "test";
    const tokens = tokenizeTemplate`${value}`;

    expect(tokens).toEqual([{ type: EXPRESSION_TOKEN, value: 0 }]);
  });

  it("should tokenize multiple expressions", () => {
    const a = "first";
    const b = "second";
    const tokens = tokenizeTemplate`${a}${b}`;

    expect(tokens).toEqual([
      { type: EXPRESSION_TOKEN, value: 0 },
      { type: EXPRESSION_TOKEN, value: 1 },
    ]);
  });

  it("should handle expression in unquoted attribute", () => {
    const id = "my-id";
    const tokens = tokenizeTemplate`<div id=${id}>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: IDENTIFIER_TOKEN, value: "id", segment: 0, start: 5, end: 7 },
      { type: EQUALS_TOKEN, segment: 0, start: 7, end: 8 },
      { type: EXPRESSION_TOKEN, value: 0 },
      { type: CLOSE_TAG_TOKEN, segment: 1, start: 0, end: 1 },
    ]);
  });

  it("should handle mixed text and expressions", () => {
    const name = "World";
    const tokens = tokenizeTemplate`Hello ${name}!`;

    expect(tokens).toEqual([
      { type: TEXT_TOKEN, value: "Hello ", segment: 0, start: 0, end: 6 },
      { type: EXPRESSION_TOKEN, value: 0 },
      { type: TEXT_TOKEN, value: "!", segment: 1, start: 0, end: 1 },
    ]);
  });

  it("should handle data attributes with hyphens and underscores", () => {
    const tokens = tokenizeTemplate`<div data-my_value="test" data_other-name="value">`;

    const attrNames = tokens.filter(
      (t) =>
        t.type === IDENTIFIER_TOKEN && (t.value as string).includes("data"),
    );
    expect(attrNames.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle spread attributes", () => {
    const props = { id: "my-id", className: "my-class" };
    const tokens = tokenizeTemplate`<div ...${props} />`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: SPREAD_TOKEN, segment: 0, start: 5, end: 8 },
      { type: EXPRESSION_TOKEN, value: 0 },
      { type: SLASH_TOKEN, segment: 1, start: 1, end: 2 },
      { type: CLOSE_TAG_TOKEN, segment: 1, start: 2, end: 3 },
    ]);
  });
});

describe("whitespace handling", () => {
  it("should skip whitespace inside tags", () => {
    const tokens = tokenizeTemplate`< \n  div   id   =   "app"  >`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 5, end: 8 },
      { type: IDENTIFIER_TOKEN, value: "id", segment: 0, start: 11, end: 13 },
      { type: EQUALS_TOKEN, segment: 0, start: 16, end: 17 },
      {
        type: QUOTED_STRING_TOKEN,
        value: "app",
        quote: '"',
        segment: 0,
        start: 20,
        end: 25,
      },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 27, end: 28 },
    ]);
  });

  it("should preserve text content whitespace", () => {
    const tokens = tokenizeTemplate`  Hello World  `;

    expect(tokens).toEqual([
      {
        type: TEXT_TOKEN,
        value: "  Hello World  ",
        segment: 0,
        start: 0,
        end: 15,
      },
    ]);
  });

  it("should handle multiline content with preserved whitespace", () => {
    const tokens = tokenizeTemplate`<div>
        Hello
      </div>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 4, end: 5 },
      {
        type: TEXT_TOKEN,
        value: "\n        Hello\n      ",
        segment: 0,
        start: 5,
        end: 26,
      },
      { type: OPEN_TAG_TOKEN, segment: 0, start: 26, end: 27 },
      { type: SLASH_TOKEN, segment: 0, start: 27, end: 28 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 28, end: 31 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 31, end: 32 },
    ]);
  });

  it("should handle tabs and mixed whitespace", () => {
    const tokens = tokenizeTemplate`\tHello\nWorld `;

    expect(tokens).toEqual([
      {
        type: TEXT_TOKEN,
        value: "\tHello\nWorld ",
        segment: 0,
        start: 0,
        end: 13,
      },
    ]);
  });

  it("should handle whitespace around expressions", () => {
    const name = "test";
    const tokens = tokenizeTemplate`  ${name}  `;

    expect(tokens).toEqual([
      { type: TEXT_TOKEN, value: "  ", segment: 0, start: 0, end: 2 },
      { type: EXPRESSION_TOKEN, value: 0 },
      { type: TEXT_TOKEN, value: "  ", segment: 1, start: 0, end: 2 },
    ]);
  });
});

describe("edge cases", () => {
  it("should handle empty template", () => {
    const tokens = tokenizeTemplate``;

    expect(tokens).toEqual([]);
  });

  it("should handle only whitespace", () => {
    const tokens = tokenizeTemplate`   `;

    expect(tokens).toEqual([
      { type: TEXT_TOKEN, value: "   ", segment: 0, start: 0, end: 3 },
    ]);
  });

  it("should handle special characters in text", () => {
    const tokens = tokenizeTemplate`Hello & goodbye`;

    expect(tokens).toEqual([
      {
        type: TEXT_TOKEN,
        value: "Hello & goodbye",
        segment: 0,
        start: 0,
        end: 15,
      },
    ]);
  });

  it("should handle consecutive expressions", () => {
    const a = "first";
    const b = "second";
    const tokens = tokenizeTemplate`${a}${b}`;

    expect(tokens).toEqual([
      { type: EXPRESSION_TOKEN, value: 0 },
      { type: EXPRESSION_TOKEN, value: 1 },
    ]);
  });

  it("should handle 1 letter tags", () => {
    const tokens = tokenizeTemplate`<tr class=${0}>
                  <td class="col-md-1" textContent=${1} />
                  <td class="col-md-4">
                    <a onClick=${2} textContent=${3} />
                  </td>
                  <td class="col-md-1">
                    <a onClick=${4}>
                      <span class="glyphicon glyphicon-remove" aria-hidden="true" />
                    </a>
                  </td>
                  <td class="col-md-6" />
                </tr>`;
    expect(
      tokens.filter((t) => t.type === IDENTIFIER_TOKEN && t.value === "a")
        .length,
    ).toBe(3);
  });
});

describe("special characters in names", () => {
  it("should tokenize tag with hyphens", () => {
    const tokens = tokenizeTemplate`<my-component />`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      {
        type: IDENTIFIER_TOKEN,
        value: "my-component",
        segment: 0,
        start: 1,
        end: 13,
      },
      { type: SLASH_TOKEN, segment: 0, start: 14, end: 15 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 15, end: 16 },
    ]);
  });

  it("should tokenize tag with periods", () => {
    const tokens = tokenizeTemplate`<my.component />`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      {
        type: IDENTIFIER_TOKEN,
        value: "my.component",
        segment: 0,
        start: 1,
        end: 13,
      },
      { type: SLASH_TOKEN, segment: 0, start: 14, end: 15 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 15, end: 16 },
    ]);
  });

  it("should tokenize tag with colons", () => {
    const tokens = tokenizeTemplate`<svg:rect />`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      {
        type: IDENTIFIER_TOKEN,
        value: "svg:rect",
        segment: 0,
        start: 1,
        end: 9,
      },
      { type: SLASH_TOKEN, segment: 0, start: 10, end: 11 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 11, end: 12 },
    ]);
  });

  it("should tokenize tag with underscores", () => {
    const tokens = tokenizeTemplate`<my_component />`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      {
        type: IDENTIFIER_TOKEN,
        value: "my_component",
        segment: 0,
        start: 1,
        end: 13,
      },
      { type: SLASH_TOKEN, segment: 0, start: 14, end: 15 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 15, end: 16 },
    ]);
  });

  it("should tokenize attribute with -_.:$", () => {
    const tokens = tokenizeTemplate`<div data-id data_id data.id data:id dataid$>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      {
        type: IDENTIFIER_TOKEN,
        value: "data-id",
        segment: 0,
        start: 5,
        end: 12,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "data_id",
        segment: 0,
        start: 13,
        end: 20,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "data.id",
        segment: 0,
        start: 21,
        end: 28,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "data:id",
        segment: 0,
        start: 29,
        end: 36,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "dataid$",
        segment: 0,
        start: 37,
        end: 44,
      },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 44, end: 45 },
    ]);
  });
});

describe("invalid syntax", () => {
  it("should throw with extra <", () => {
    expect(() => tokenizeTemplate`<<div / >`).toThrow();
  });

  it("should throw with extra <", () => {
    expect(() => tokenizeTemplate`<div / <>`).toThrow();
  });

  it("should throw on invalid identofier", () => {
    expect(() => tokenizeTemplate`<.div />`).toThrow();
  });

  it("should throw on invalid identofier", () => {
    expect(() => tokenizeTemplate`<div @fa />`).toThrow();
  });

  it("should throw on invalid identofier", () => {
    expect(() => tokenizeTemplate`<div 0fa />`).toThrow();
  });

  it("should throw descriptive error for unterminated string", () => {
    expect(() => tokenizeTemplate`<div id="hello`).toThrow(
      "Unterminated string",
    );
  });

  it("should throw descriptive error for unexpected character", () => {
    expect(() => tokenizeTemplate`<div @attr />`).toThrow(
      "Unexpected character: '@'",
    );
  });

  it("should throw with unterminated string", () => {
    expect(() => tokenizeTemplate`<div id="hello>`).toThrow();
  });
});

describe("bad but valid syntaxes", () => {
  it("should handle multiple attributes in tight syntax", () => {
    const tokens = tokenizeTemplate`<div a="1"b="2"c="3">`;

    const attrNames = tokens.filter(
      (t) =>
        t.type === IDENTIFIER_TOKEN &&
        t.value &&
        /^[abc]$/.test(t.value as string),
    );
    expect(attrNames).toHaveLength(3);
  });

  it("should handle attribute without value but with slash", () => {
    const tokens = tokenizeTemplate`<div required/>`;

    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: IDENTIFIER_TOKEN,
        value: "required",
      }),
    );
    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: SLASH_TOKEN,
      }),
    );
  });

  it("should handle whitespace variations", () => {
    const tokens = tokenizeTemplate`<div   id   =   "value"   />`;

    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: IDENTIFIER_TOKEN,
        value: "id",
      }),
    );
    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: QUOTED_STRING_TOKEN,
        value: "value",
      }),
    );
  });
});

describe("comments handling", () => {
  it("should tokenize comments", () => {
    const tokens = tokenizeTemplate`<div><!-- This is a comment --></div>`;
    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 4, end: 5 },
      {
        type: COMMENT_START_TOKEN,
        segment: 0,
        start: 5,
        end: 9,
        value: "<!--",
      },
      {
        type: TEXT_TOKEN,
        value: " This is a comment ",
        segment: 0,
        start: 9,
        end: 28,
      },
      { type: COMMENT_END_TOKEN, segment: 0, start: 28, end: 31, value: "-->" },
      { type: OPEN_TAG_TOKEN, segment: 0, start: 31, end: 32 },
      { type: SLASH_TOKEN, segment: 0, start: 32, end: 33 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 33, end: 36 },
      { type: CLOSE_TAG_TOKEN, segment: 0, start: 36, end: 37 },
    ]);
  });

  it("should handle comments with special characters", () => {
    const tokens = tokenizeTemplate`<!-- Special chars: <>&'" -->`;
    expect(tokens).toEqual([
      {
        type: COMMENT_START_TOKEN,
        segment: 0,
        start: 0,
        end: 4,
        value: "<!--",
      },
      {
        type: TEXT_TOKEN,
        value: " Special chars: <>&'\" ",
        segment: 0,
        start: 4,
        end: 26,
      },
      { type: COMMENT_END_TOKEN, segment: 0, start: 26, end: 29, value: "-->" },
    ]);
  });

  it("should handle comments with expressions inside", () => {
    const value = "test";
    const tokens = tokenizeTemplate`<!-- Comment with ${value} inside -->`;
    expect(tokens).toEqual([
      {
        type: COMMENT_START_TOKEN,
        segment: 0,
        start: 0,
        end: 4,
        value: "<!--",
      },
      {
        type: TEXT_TOKEN,
        value: " Comment with ",
        segment: 0,
        start: 4,
        end: 18,
      },
      { type: EXPRESSION_TOKEN, value: 0 },
      { type: TEXT_TOKEN, value: " inside ", segment: 1, start: 0, end: 8 },
      { type: COMMENT_END_TOKEN, segment: 1, start: 8, end: 11, value: "-->" },
    ]);
  });

  it("should tokenize line comment in tag", () => {
    const tokens = tokenizeTemplate`<div // comment\n>`;
    expect(tokens).toEqual([
      { type: "<", segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: COMMENT_START_TOKEN, value: "//", segment: 0, start: 5, end: 7 },
      { type: TEXT_TOKEN, value: " comment", segment: 0, start: 7, end: 15 },
      { type: COMMENT_END_TOKEN, value: "\n", segment: 0, start: 15, end: 16 },
      { type: ">", segment: 0, start: 16, end: 17 },
    ]);
  });

  it("should tokenize shorthand closing tag with line comment", () => {
    const tokens = tokenizeTemplate`<${1} 
    // comment
    >${1}<//>`;
    expect(tokens[2]).toEqual({
      type: COMMENT_START_TOKEN,
      value: "//",
      segment: 1,
      start: 6,
      end: 8,
    });
    expect(tokens[3]).toEqual({
      type: TEXT_TOKEN,
      value: " comment",
      segment: 1,
      start: 8,
      end: 16,
    });
    expect(tokens[4]).toEqual({
      type: COMMENT_END_TOKEN,
      value: "\n",
      segment: 1,
      start: 16,
      end: 17,
    });
    expect(tokens[9]).toEqual({
      type: SLASH_TOKEN,
      segment: 2,
      start: 2,
      end: 3,
    });
  });

  it("should tokenize block comment in tag", () => {
    const tokens = tokenizeTemplate`<div /* comment */>`;
    expect(tokens).toEqual([
      { type: "<", segment: 0, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", segment: 0, start: 1, end: 4 },
      { type: COMMENT_START_TOKEN, value: "/*", segment: 0, start: 5, end: 7 },
      { type: TEXT_TOKEN, value: " comment ", segment: 0, start: 7, end: 16 },
      { type: COMMENT_END_TOKEN, value: "*/", segment: 0, start: 16, end: 18 },
      { type: ">", segment: 0, start: 18, end: 19 },
    ]);
  });
});
