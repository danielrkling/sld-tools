import { describe, it, expect } from "vitest";
import {
  tokenize,
  OPEN_TAG_TOKEN,
  CLOSE_TAG_TOKEN,
  SLASH_TOKEN,
  IDENTIFIER_TOKEN,
  EQUALS_TOKEN,
  ATTRIBUTE_VALUE_TOKEN,
  TEXT_TOKEN,
  EXPRESSION_TOKEN,
  QUOTE_CHAR_TOKEN,
  IdentifierToken,
} from "../src/tokenize";
import { rawTextElements } from "../src/util";

function tokenizeTemplate(strings: TemplateStringsArray, ...values: any[]) {
  return tokenize(strings, rawTextElements);
}

describe("basic tags", () => {
  it("should tokenize opening tag", () => {
    const tokens = tokenizeTemplate`<div`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
    ]);
  });

  it("should tokenize complete tag", () => {
    const tokens = tokenizeTemplate`<div>`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 4,
        end: 5,
      },
    ]);
  });

  it("should tokenize self-closing tag", () => {
    const tokens = tokenizeTemplate`<div />`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: SLASH_TOKEN,
        start: 5,
        end: 6,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 6,
        end: 7,
      },
    ]);
  });

  it("should tokenize opening and closing tag", () => {
    const tokens = tokenizeTemplate`<div></div>`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 4,
        end: 5,
      },
      {
        type: OPEN_TAG_TOKEN,
        start: 5,
        end: 6,
      },
      {
        type: SLASH_TOKEN,
        start: 6,
        end: 7,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 7,
        end: 10,
      },

      {
        type: CLOSE_TAG_TOKEN,
        start: 10,
        end: 11,
      },
    ]);
  });
});

describe("attribute values", () => {
  it("should tokenize quoted string", () => {
    const tokens = tokenizeTemplate`<div id="hello">`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "id",
        start: 5,
        end: 7,
      },
      {
        type: EQUALS_TOKEN,
        start: 7,
        end: 8,
      },
      {
        type: QUOTE_CHAR_TOKEN,
        value: '"',
        start: 8,
        end: 9,
      },
      {
        type: ATTRIBUTE_VALUE_TOKEN,
        value: "hello",
        start: 9,
        end: 14,
      },
      {
        type: QUOTE_CHAR_TOKEN,
        value: '"',
        start: 14,
        end: 15,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 15,
        end: 16,
      },
    ]);
  });

  it("should tokenize single quoted string", () => {
    const tokens = tokenizeTemplate`<div id='hello'>`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "id",
        start: 5,
        end: 7,
      },
      {
        type: EQUALS_TOKEN,
        start: 7,
        end: 8,
      },
      {
        type: QUOTE_CHAR_TOKEN,
        value: "'",
        start: 8,
        end: 9,
      },
      {
        type: ATTRIBUTE_VALUE_TOKEN,
        value: "hello",
        start: 9,
        end: 14,
      },
      {
        type: QUOTE_CHAR_TOKEN,
        value: "'",
        start: 14,
        end: 15,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 15,
        end: 16,
      },
    ]);
  });

  it("should handle empty quoted string", () => {
    const tokens = tokenizeTemplate`<div class="">`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "class",
        start: 5,
        end: 10,
      },
      {
        type: EQUALS_TOKEN,
        start: 10,
        end: 11,
      },
      {
        type: QUOTE_CHAR_TOKEN,
        value: '"',
        start: 11,
        end: 12,
      },

      {
        type: QUOTE_CHAR_TOKEN,
        value: '"',
        start: 12,
        end: 13,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 13,
        end: 14,
      },
    ]);
  });

  it("should handle boolean like attribute", () => {
    const tokens = tokenizeTemplate`<div enabled bool>`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "enabled",
        start: 5,
        end: 12,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "bool",
        start: 13,
        end: 17,
      },

      {
        type: CLOSE_TAG_TOKEN,
        start: 17,
        end: 18,
      },
    ]);
  });

  it("should handle deeply nested quotes", () => {
    const tokens = tokenizeTemplate`<div data="value with 'nested' quotes">`;

    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: ATTRIBUTE_VALUE_TOKEN,
        value: "value with 'nested' quotes",
      }),
    );
  });

  it("should handle attribute values with special characters", () => {
    const tokens = tokenizeTemplate`<div data="!@#$%^&*()_+-=[]{}|;:,.<>?">`;

    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: ATTRIBUTE_VALUE_TOKEN,
        value: "!@#$%^&*()_+-=[]{}|;:,.<>?",
      }),
    );
  });

  it("should handle empty attribute values", () => {
    const tokens = tokenizeTemplate`<div attr="">`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "attr",
        start: 5,
        end: 9,
      },
      {
        type: EQUALS_TOKEN,
        start: 9,
        end: 10,
      },
      {
        type: QUOTE_CHAR_TOKEN,
        value: '"',
        start: 10,
        end: 11,
      },
      {
        type: QUOTE_CHAR_TOKEN,
        value: '"',
        start: 11,
        end: 12,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 12,
        end: 13,
      },
    ]);
  });

  it("should handle URL-like attribute values", () => {
    const tokens = tokenizeTemplate`<a href="https://example.com/path?query=value&other=test#section">`;

    expect(tokens).toContainEqual(
      expect.objectContaining({
        type: ATTRIBUTE_VALUE_TOKEN,
        value: "https://example.com/path?query=value&other=test#section",
      }),
    );
  });

  it("attribute name doesnt trigger raw text", () => {
    const tokens = tokenizeTemplate`
            <h1 title=""></h1>
          `;

    expect(tokens).toEqual([
      { type: TEXT_TOKEN, value: "\n            ", start: 0, end: 13 },
      { type: OPEN_TAG_TOKEN, start: 13, end: 14 },
      { type: IDENTIFIER_TOKEN, value: "h1", start: 14, end: 16 },
      { type: IDENTIFIER_TOKEN, value: "title", start: 17, end: 22 },
      { type: EQUALS_TOKEN, start: 22, end: 23 },
      { type: QUOTE_CHAR_TOKEN, value: '"', start: 23, end: 24 },
      { type: QUOTE_CHAR_TOKEN, value: '"', start: 24, end: 25 },
      { type: CLOSE_TAG_TOKEN, start: 25, end: 26 },
      { type: OPEN_TAG_TOKEN, start: 26, end: 27 },
      { type: SLASH_TOKEN, start: 27, end: 28 },
      { type: IDENTIFIER_TOKEN, value: "h1", start: 28, end: 30 },
      { type: CLOSE_TAG_TOKEN, start: 30, end: 31 },
      { type: TEXT_TOKEN, value: "\n          ", start: 31, end: 42 },
    ]);
  });
});

describe("expressions", () => {
  it("should tokenize simple expression", () => {
    const value = "test";
    const tokens = tokenizeTemplate`${value}`;

    expect(tokens).toEqual([
      {
        type: EXPRESSION_TOKEN,
        value: 0,
        start: 0,
        end: 0,
      },
    ]);
  });

  it("should tokenize multiple expressions", () => {
    const a = "first";
    const b = "second";
    const tokens = tokenizeTemplate`${a}${b}`;

    expect(tokens).toEqual([
      {
        type: EXPRESSION_TOKEN,
        value: 0,
        start: 0,
        end: 0,
      },
      {
        type: EXPRESSION_TOKEN,
        value: 1,
        start: 0,
        end: 0,
      },
    ]);
  });

  it("should handle expression in unquoted attribute", () => {
    const id = "my-id";
    const tokens = tokenizeTemplate`<div id=${id}>`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "id",
        start: 5,
        end: 7,
      },
      {
        type: EQUALS_TOKEN,
        start: 7,
        end: 8,
      },
      {
        type: EXPRESSION_TOKEN,
        value: 0,
        start: 8,
        end: 8,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 8,
        end: 9,
      },
    ]);
  });

  it("should mark expression in quoted attribute context", () => {
    const id = "my-id";
    const tokens = tokenizeTemplate`<div id="${id}">`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "id",
        start: 5,
        end: 7,
      },
      {
        type: EQUALS_TOKEN,
        start: 7,
        end: 8,
      },
      { type: QUOTE_CHAR_TOKEN, value: '"', start: 8, end: 9 },
      {
        type: EXPRESSION_TOKEN,
        value: 0,
        start: 9,
        end: 9,
      },
      { type: QUOTE_CHAR_TOKEN, value: '"', start: 9, end: 10 },
      {
        type: CLOSE_TAG_TOKEN,
        start: 10,
        end: 11,
      },
    ]);
  });

  it("should mark expression in quoted attribute context", () => {
    const id = "my-id";
    const tokens = tokenizeTemplate`<div id='${id}'>`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "id",
        start: 5,
        end: 7,
      },
      {
        type: EQUALS_TOKEN,
        start: 7,
        end: 8,
      },
      { type: QUOTE_CHAR_TOKEN, value: "'", start: 8, end: 9 },
      {
        type: EXPRESSION_TOKEN,
        value: 0,
        start: 9,
        end: 9,
      },
      { type: QUOTE_CHAR_TOKEN, value: "'", start: 9, end: 10 },
      {
        type: CLOSE_TAG_TOKEN,
        start: 10,
        end: 11,
      },
    ]);
  });

  it("should handle mixed text and expressions", () => {
    const name = "World";
    const tokens = tokenizeTemplate`Hello ${name}!`;

    expect(tokens).toEqual([
      {
        type: TEXT_TOKEN,
        value: "Hello ",
        start: 0,
        end: 6,
      },
      {
        type: EXPRESSION_TOKEN,
        value: 0,
        start: 6,
        end: 6,
      },
      {
        type: TEXT_TOKEN,
        value: "!",
        start: 6,
        end: 7,
      },
    ]);
  });

  it("should handle mixed text and expressions in attribute value", () => {
    const id = "my-id";
    const tokens = tokenizeTemplate`<div id='id-${id}'>`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "id",
        start: 5,
        end: 7,
      },
      {
        type: EQUALS_TOKEN,
        start: 7,
        end: 8,
      },
      { type: QUOTE_CHAR_TOKEN, value: "'", start: 8, end: 9 },
      {
        type: ATTRIBUTE_VALUE_TOKEN,
        value: "id-",
        start: 9,
        end: 12,
      },
      {
        type: EXPRESSION_TOKEN,
        value: 0,
        start: 12,
        end: 12,
      },
      { type: QUOTE_CHAR_TOKEN, value: "'", start: 12, end: 13 },
      {
        type: CLOSE_TAG_TOKEN,
        start: 13,
        end: 14,
      },
    ]);
  });

  it("should handle data attributes with hyphens and underscores", () => {
    const tokens = tokenizeTemplate`<div data-my_value="test" data_other-name="value">`;

    const attrNames = tokens.filter(
      (t) => t.type === IDENTIFIER_TOKEN && (t.value as string).includes("data"),
    );
    expect(attrNames.length).toBeGreaterThanOrEqual(2);
  });
});

describe("whitespace handling", () => {
  it("should skip whitespace inside tags", () => {
    const tokens = tokenizeTemplate`< \n  div   id   =   "app"  >`;

    // Should not have whitespace tokens in tag context
    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 5,
        end: 8,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "id",
        start: 11,
        end: 13,
      },
      {
        type: EQUALS_TOKEN,
        start: 16,
        end: 17,
      },
      {
        type: QUOTE_CHAR_TOKEN,
        value: '"',
        start: 20,
        end: 21,
      },
      {
        type: ATTRIBUTE_VALUE_TOKEN,
        value: "app",
        start: 21,
        end: 24,
      },
      {
        type: QUOTE_CHAR_TOKEN,
        value: '"',
        start: 24,
        end: 25,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 27,
        end: 28,
      },
    ]);
  });

  it("should preserve text content whitespace", () => {
    const tokens = tokenizeTemplate`  Hello World  `;

    expect(tokens).toEqual([
      {
        type: TEXT_TOKEN,
        value: "  Hello World  ",
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
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 4,
        end: 5,
      },
      {
        type: TEXT_TOKEN,
        value: "\n        Hello\n      ",
        start: 5,
        end: 26,
      },
      {
        type: OPEN_TAG_TOKEN,
        start: 26,
        end: 27,
      },
      {
        type: SLASH_TOKEN,
        start: 27,
        end: 28,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 28,
        end: 31,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 31,
        end: 32,
      },
    ]);
  });

  it("should handle tabs and mixed whitespace", () => {
    const tokens = tokenizeTemplate`\tHello\nWorld `;

    expect(tokens).toEqual([
      {
        type: TEXT_TOKEN,
        value: "\tHello\nWorld ",
        start: 0,
        end: 13,
      },
    ]);
  });

  it("should handle whitespace around expressions", () => {
    const name = "test";
    const tokens = tokenizeTemplate`  ${name}  `;

    expect(tokens).toEqual([
      {
        type: TEXT_TOKEN,
        value: "  ",
        start: 0,
        end: 2,
      },
      {
        type: EXPRESSION_TOKEN,
        value: 0,
        start: 2,
        end: 2,
      },
      {
        type: TEXT_TOKEN,
        value: "  ",
        start: 2,
        end: 4,
      },
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
      {
        type: TEXT_TOKEN,
        value: "   ",
        start: 0,
        end: 3,
      },
    ]);
  });

  it("should handle special characters in text", () => {
    const tokens = tokenizeTemplate`Hello & goodbye`;

    expect(tokens).toEqual([
      {
        type: TEXT_TOKEN,
        value: "Hello & goodbye",
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
      {
        type: EXPRESSION_TOKEN,
        value: 0,
        start: 0,
        end: 0,
      },
      {
        type: EXPRESSION_TOKEN,
        value: 1,
        start: 0,
        end: 0,
      },
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
    expect(tokens.filter((t) => t.type === IDENTIFIER_TOKEN && t.value === "a").length).toBe(3);
  });
});

describe("special characters in names", () => {
  it("should tokenize tag with hyphens", () => {
    const tokens = tokenizeTemplate`<my-component />`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "my-component",
        start: 1,
        end: 13,
      },
      {
        type: SLASH_TOKEN,
        start: 14,
        end: 15,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 15,
        end: 16,
      },
    ]);
  });

  it("should tokenize tag with periods", () => {
    const tokens = tokenizeTemplate`<my.component />`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "my.component",
        start: 1,
        end: 13,
      },
      {
        type: SLASH_TOKEN,
        start: 14,
        end: 15,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 15,
        end: 16,
      },
    ]);
  });

  it("should tokenize tag with colons", () => {
    const tokens = tokenizeTemplate`<svg:rect />`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "svg:rect",
        start: 1,
        end: 9,
      },
      {
        type: SLASH_TOKEN,
        start: 10,
        end: 11,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 11,
        end: 12,
      },
    ]);
  });

  it("should tokenize tag with underscores", () => {
    const tokens = tokenizeTemplate`<my_component />`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "my_component",
        start: 1,
        end: 13,
      },
      {
        type: SLASH_TOKEN,
        start: 14,
        end: 15,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 15,
        end: 16,
      },
    ]);
  });

  it("should tokenize attribute with -_.:$", () => {
    const tokens = tokenizeTemplate`<div data-id data_id data.id data:id dataid$>`;

    expect(tokens).toEqual([
      {
        type: OPEN_TAG_TOKEN,
        start: 0,
        end: 1,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "div",
        start: 1,
        end: 4,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "data-id",
        start: 5,
        end: 12,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "data_id",
        start: 13,
        end: 20,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "data.id",
        start: 21,
        end: 28,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "data:id",
        start: 29,
        end: 36,
      },
      {
        type: IDENTIFIER_TOKEN,
        value: "dataid$",
        start: 37,
        end: 44,
      },
      {
        type: CLOSE_TAG_TOKEN,
        start: 44,
        end: 45,
      },
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
});

describe("bad but valid syntaxes", () => {
  it("should handle multiple attributes in tight syntax", () => {
    const tokens = tokenizeTemplate`<div a="1"b="2"c="3">`;

    const attrNames = tokens.filter(
      (t) => t.type === IDENTIFIER_TOKEN && t.value && /^[abc]$/.test(t.value as string),
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
        type: ATTRIBUTE_VALUE_TOKEN,
        value: "value",
      }),
    );
  });
});

describe("handling of raw text elements", () => {
  it("should tokenize content inside <script> as text", () => {
    const tokens = tokenizeTemplate`<script>const a = 5<10;</script>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "script", start: 1, end: 7 },
      { type: CLOSE_TAG_TOKEN, start: 7, end: 8 },
      { type: TEXT_TOKEN, value: "const a = 5<10;", start: 8, end: 23 },
      { type: OPEN_TAG_TOKEN, start: 23, end: 24 },
      { type: SLASH_TOKEN, start: 24, end: 25 },
      { type: IDENTIFIER_TOKEN, value: "script", start: 25, end: 31 },
      { type: CLOSE_TAG_TOKEN, start: 31, end: 32 },
    ]);
  });

  it("should tokenize content inside <style> as text", () => {
    const tokens = tokenizeTemplate`<style>.class > span { color: red; }</style>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "style", start: 1, end: 6 },
      { type: CLOSE_TAG_TOKEN, start: 6, end: 7 },
      { type: TEXT_TOKEN, value: ".class > span { color: red; }", start: 7, end: 36 },
      { type: OPEN_TAG_TOKEN, start: 36, end: 37 },
      { type: SLASH_TOKEN, start: 37, end: 38 },
      { type: IDENTIFIER_TOKEN, value: "style", start: 38, end: 43 },
      { type: CLOSE_TAG_TOKEN, start: 43, end: 44 },
    ]);
  });

  it("should tokenize content inside <textarea> as text", () => {
    const tokens = tokenizeTemplate`<textarea>This is <span>not parsed</span>.</textarea>`;

    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 1, end: 9 },
      { type: CLOSE_TAG_TOKEN, start: 9, end: 10 },
      { type: TEXT_TOKEN, value: "This is <span>not parsed</span>.", start: 10, end: 42 },
      { type: OPEN_TAG_TOKEN, start: 42, end: 43 },
      { type: SLASH_TOKEN, start: 43, end: 44 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 44, end: 52 },
      { type: CLOSE_TAG_TOKEN, start: 52, end: 53 },
    ]);
  });

  it("should handle raw text elements with attributes and expressions", () => {
    const tokens = tokenizeTemplate`<textarea type=${0}><span>${1}</span></textarea>`;
    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 1, end: 9 },
      { type: IDENTIFIER_TOKEN, value: "type", start: 10, end: 14 },
      { type: EQUALS_TOKEN, start: 14, end: 15 },
      { type: EXPRESSION_TOKEN, value: 0, start: 15, end: 15 },
      { type: CLOSE_TAG_TOKEN, start: 15, end: 16 },
      { type: TEXT_TOKEN, value: "<span>", start: 16, end: 22 },
      { type: EXPRESSION_TOKEN, value: 1, start: 22, end: 22 },
      { type: TEXT_TOKEN, value: "</span>", start: 22, end: 29 },
      { type: OPEN_TAG_TOKEN, start: 29, end: 30 },
      { type: SLASH_TOKEN, start: 30, end: 31 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 31, end: 39 },
      { type: CLOSE_TAG_TOKEN, start: 39, end: 40 },
    ]);
  });

  it("should handle raw text elements and white space in tags", () => {
    const tokens = tokenizeTemplate`<   textarea  >  ${0}<  /   textarea   >`;
    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 4, end: 12 },
      { type: CLOSE_TAG_TOKEN, start: 14, end: 15 },
      { type: TEXT_TOKEN, value: `  `, start: 15, end: 17 },
      { type: EXPRESSION_TOKEN, value: 0, start: 17, end: 17 },
      { type: OPEN_TAG_TOKEN, start: 17, end: 18 },
      { type: SLASH_TOKEN, start: 20, end: 21 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 24, end: 32 },
      { type: CLOSE_TAG_TOKEN, start: 35, end: 36 },
    ]);
  });

  it("should handle nested raw text elements", () => {
    const tokens = tokenizeTemplate`<textarea><textarea>const a = 5;</textarea></textarea>`;
    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 1, end: 9 },
      { type: CLOSE_TAG_TOKEN, start: 9, end: 10 },
      { type: TEXT_TOKEN, value: "<textarea>const a = 5;", start: 10, end: 32 },
      { type: OPEN_TAG_TOKEN, start: 32, end: 33 },
      { type: SLASH_TOKEN, start: 33, end: 34 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 34, end: 42 },
      { type: CLOSE_TAG_TOKEN, start: 42, end: 43 },
      { type: OPEN_TAG_TOKEN, start: 43, end: 44 },
      { type: SLASH_TOKEN, start: 44, end: 45 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 45, end: 53 },
      { type: CLOSE_TAG_TOKEN, start: 53, end: 54 },
    ]);
  });

  it("should handle self-closing raw text elements", () => {
    const tokens = tokenizeTemplate`<textarea ${0} />Text`;
    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "textarea", start: 1, end: 9 },
      { type: EXPRESSION_TOKEN, value: 0, start: 10, end: 10 },
      { type: SLASH_TOKEN, start: 11, end: 12 },
      { type: CLOSE_TAG_TOKEN, start: 12, end: 13 },
      { type: TEXT_TOKEN, value: "Text", start: 13, end: 17 },
    ]);
  });
});

describe("comments handling", () => {
  it("should not tokenzie comments", () => {
    const tokens = tokenizeTemplate`<div><!-- This is a comment --></div>`;
    expect(tokens).toEqual([
      { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
      { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
      { type: CLOSE_TAG_TOKEN, start: 4, end: 5 },
      { type: OPEN_TAG_TOKEN, start: 31, end: 32 },
      { type: SLASH_TOKEN, start: 32, end: 33 },
      { type: IDENTIFIER_TOKEN, value: "div", start: 33, end: 36 },
      { type: CLOSE_TAG_TOKEN, start: 36, end: 37 },
    ]);
  });

  it("should handle comments with special characters", () => {
    const tokens = tokenizeTemplate`<!-- Special chars: <>&'" -->`;
    expect(tokens).toEqual([]);
  });

  it("should handle comments with expressions inside", () => {
    const value = "test";
    const tokens = tokenizeTemplate`<!-- Comment with ${value} inside -->`;
    expect(tokens).toEqual([]);
  });
});
