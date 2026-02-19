import { describe, it, expect } from "vitest";
import {
  BOOLEAN_PROP,
  ELEMENT_NODE,
  EXPRESSION_NODE,
  MIXED_PROP,
  ROOT_NODE,
  STATIC_PROP,
  TEXT_NODE,
  EXPRESSION_PROP,
  SPREAD_PROP,
  parse,
} from "../src/parse";
import { 
  TEXT_TOKEN,
  EXPRESSION_TOKEN,
  OPEN_TAG_TOKEN,
  IDENTIFIER_TOKEN,
  CLOSE_TAG_TOKEN,
  SLASH_TOKEN,
  EQUALS_TOKEN,
  QUOTE_CHAR_TOKEN,
  ATTRIBUTE_VALUE_TOKEN,
  SPREAD_TOKEN
} from "../src/tokenize";
import { rawTextElements, voidElements } from "../src/util";
import { tokenize } from "../src/tokenize";

function jsx(strings: TemplateStringsArray, ...values: any[]) {
  return parse(tokenize(strings, rawTextElements), voidElements);
}

describe("Simple AST", () => {
  it("simple text", () => {
    const ast = jsx`Hello World!`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [{ type: TEXT_NODE, value: "Hello World!", text: { type: TEXT_TOKEN, value: "Hello World!", start: 0, end: 12 } }],
    });
  });

  it("simple element", () => {
    const ast = jsx`<div></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [{ 
        type: ELEMENT_NODE, 
        name: "div", 
        props: [], 
        children: [],
        open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
        nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
        close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
      }],
    });
  });

  it("text content", () => {
    const ast = jsx`<div>Hello</div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: TEXT_NODE, value: "Hello", text: { type: TEXT_TOKEN, value: "Hello", start: 5, end: 10 } }],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
        },
      ],
    });
  });

  it("expression inside text", () => {
    const name = "World";
    const ast = jsx`<div>Hello ${name}</div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            { type: TEXT_NODE, value: "Hello ", text: { type: TEXT_TOKEN, value: "Hello ", start: 5, end: 11 } },
            { type: EXPRESSION_NODE, value: 0, expression: { type: EXPRESSION_TOKEN, value: 0, start: 11, end: 11 } },
          ],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
        },
      ],
    });
  });

  it("self-closing", () => {
    const ast = jsx`<input />`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [{ 
        type: ELEMENT_NODE, 
        name: "input", 
        props: [], 
        children: [],
        open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
        nameToken: { type: IDENTIFIER_TOKEN, value: "input", start: 1, end: 6 },
        slash: { type: SLASH_TOKEN, start: 7, end: 8 },
        close: { type: CLOSE_TAG_TOKEN, start: 8, end: 9 }
      }],
    });
  });

  it("nested elements", () => {
    const ast = jsx`
      <div>
        <span>text</span>
      </div>
    `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            {
              type: ELEMENT_NODE,
              name: "span",
              props: [],
              children: [{ type: TEXT_NODE, value: "text", text: { type: TEXT_TOKEN, value: "text", start: 27, end: 31 } }],
              open: { type: OPEN_TAG_TOKEN, start: 21, end: 22 },
              nameToken: { type: IDENTIFIER_TOKEN, value: "span", start: 22, end: 26 },
              close: { type: CLOSE_TAG_TOKEN, start: 26, end: 27 }
            },
          ],
          open: { type: OPEN_TAG_TOKEN, start: 7, end: 8 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 8, end: 11 },
          close: { type: CLOSE_TAG_TOKEN, start: 11, end: 12 }
        },
      ],
    });
  });
});

describe("Attributes", () => {
  it("string attribute", () => {
    const ast = jsx`<div id="app"></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [{ 
            name: "id", 
            type: STATIC_PROP, 
            value: "app", 
            quote: '"',
            nameToken: { type: IDENTIFIER_TOKEN, value: "id", start: 5, end: 7 },
            equalsToken: { type: EQUALS_TOKEN, start: 7, end: 8 },
            openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 8, end: 9 },
            valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "app", start: 9, end: 12 }],
            closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 12, end: 13 }
          }],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 13, end: 14 }
        },
      ],
    });
  });

  it("string attribute single quoted", () => {
    const ast = jsx`<div id='app'></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [{ 
            name: "id", 
            type: STATIC_PROP, 
            value: "app", 
            quote: "'",
            nameToken: { type: IDENTIFIER_TOKEN, value: "id", start: 5, end: 7 },
            equalsToken: { type: EQUALS_TOKEN, start: 7, end: 8 },
            openQuote: { type: QUOTE_CHAR_TOKEN, value: "'", start: 8, end: 9 },
            valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "app", start: 9, end: 12 }],
            closeQuote: { type: QUOTE_CHAR_TOKEN, value: "'", start: 12, end: 13 }
          }],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 13, end: 14 }
        },
      ],
    });
  });

  it("boolean attribute", () => {
    const ast = jsx`<input checked />`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "input",
          props: [{ 
            name: "checked", 
            type: BOOLEAN_PROP, 
            value: true,
            nameToken: { type: IDENTIFIER_TOKEN, value: "checked", start: 7, end: 14 }
          }],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "input", start: 1, end: 6 },
          slash: { type: SLASH_TOKEN, start: 15, end: 16 },
          close: { type: CLOSE_TAG_TOKEN, start: 16, end: 17 }
        },
      ],
    });
  });

  it("boolean attribute", () => {
    const ast = jsx`<button checked></button>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "button",
          props: [{ 
            name: "checked", 
            type: BOOLEAN_PROP, 
            value: true,
            nameToken: { type: IDENTIFIER_TOKEN, value: "checked", start: 8, end: 15 }
          }],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "button", start: 1, end: 7 },
          close: { type: CLOSE_TAG_TOKEN, start: 15, end: 16 }
        },
      ],
    });
  });

  it("expression attribute", () => {
    const id = "my-id";
    const ast = jsx`<div id=${id}></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "div",
          props: [{ 
            name: "id", 
            type: EXPRESSION_PROP, 
            value: 0,
            nameToken: { type: IDENTIFIER_TOKEN, value: "id", start: 5, end: 7 },
            equalsToken: { type: EQUALS_TOKEN, start: 7, end: 8 },
            expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 8, end: 8 }
          }],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 8, end: 9 }
        },
      ],
    });
  });

  it("quoted expression attribute", () => {
    const id = "my-id";
    const ast = jsx`<div id="${id}"></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "div",
          props: [{ 
            name: "id", 
            type: EXPRESSION_PROP, 
            value: 0, 
            quote: '"',
            nameToken: { type: IDENTIFIER_TOKEN, value: "id", start: 5, end: 7 },
            equalsToken: { type: EQUALS_TOKEN, start: 7, end: 8 },
            expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 9, end: 9 }
          }],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 10, end: 11 }
        },
      ],
    });
  });

  it("single quoted expression attribute", () => {
    const id = "my-id";
    const ast = jsx`<div id='${id}'></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "div",
          props: [{ 
            name: "id", 
            type: EXPRESSION_PROP, 
            value: 0, 
            quote: "'",
            nameToken: { type: IDENTIFIER_TOKEN, value: "id", start: 5, end: 7 },
            equalsToken: { type: EQUALS_TOKEN, start: 7, end: 8 },
            expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 9, end: 9 }
          }],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 10, end: 11 }
        },
      ],
    });
  });

  it("mixed attribute (string + expression)", () => {
    const active = true;
    const ast = jsx`<div class="btn ${active ? "active" : ""}"></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [
            {
              name: "class",
              type: MIXED_PROP,
              value: ["btn ", 0],
              quote: '"',
              nameToken: { type: IDENTIFIER_TOKEN, value: "class", start: 5, end: 10 },
              equalsToken: { type: EQUALS_TOKEN, start: 10, end: 11 },
              openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 11, end: 12 },
              valueTokens: [
                { type: ATTRIBUTE_VALUE_TOKEN, value: "btn ", start: 12, end: 16 },
                { type: EXPRESSION_TOKEN, value: 0, start: 16, end: 16 }
              ],
              closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 16, end: 17 }
            },
          ],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 17, end: 18 }
        },
      ],
    });
  });

  it("mixed attribute (string + expression) with single quotes", () => {
    const active = true;
    const ast = jsx`<div class='btn ${active ? "active" : ""}'></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [
            {
              name: "class",
              type: MIXED_PROP,
              value: ["btn ", 0],
              quote: "'",
              nameToken: { type: IDENTIFIER_TOKEN, value: "class", start: 5, end: 10 },
              equalsToken: { type: EQUALS_TOKEN, start: 10, end: 11 },
              openQuote: { type: QUOTE_CHAR_TOKEN, value: "'", start: 11, end: 12 },
              valueTokens: [
                { type: ATTRIBUTE_VALUE_TOKEN, value: "btn ", start: 12, end: 16 },
                { type: EXPRESSION_TOKEN, value: 0, start: 16, end: 16 }
              ],
              closeQuote: { type: QUOTE_CHAR_TOKEN, value: "'", start: 16, end: 17 }
            },
          ],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 17, end: 18 }
        },
      ],
    });
  });

  it("mixed attribute (2 expression) with whitespace", () => {
    const active = true;
    const ast = jsx`<div class="${active ? "active" : ""}  ${"1"}"></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [
            {
              name: "class",
              type: MIXED_PROP,
              value: [0, "  ", 1],
              quote: '"',
              nameToken: { type: IDENTIFIER_TOKEN, value: "class", start: 5, end: 10 },
              equalsToken: { type: EQUALS_TOKEN, start: 10, end: 11 },
              openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 11, end: 12 },
              valueTokens: [
                { type: EXPRESSION_TOKEN, value: 0, start: 12, end: 12 },
                { type: ATTRIBUTE_VALUE_TOKEN, value: "  ", start: 12, end: 14 },
                { type: EXPRESSION_TOKEN, value: 1, start: 14, end: 14 }
              ],
              closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 14, end: 15 }
            },
          ],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 15, end: 16 }
        },
      ],
    });
  });

  it("mixed attributes", () => {
    const ast = jsx`
    <h1 title="${1} John ${"Smith"}"></h1>
  `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "h1",
          props: [
            {
              name: "title",
              type: MIXED_PROP,
              value: [0, " John ", 1],
              quote: '"',
              nameToken: { type: IDENTIFIER_TOKEN, value: "title", start: 9, end: 14 },
              equalsToken: { type: EQUALS_TOKEN, start: 14, end: 15 },
              openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 15, end: 16 },
              valueTokens: [
                { type: EXPRESSION_TOKEN, value: 0, start: 16, end: 16 },
                { type: ATTRIBUTE_VALUE_TOKEN, value: " John ", start: 16, end: 22 },
                { type: EXPRESSION_TOKEN, value: 1, start: 22, end: 22 }
              ],
              closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 22, end: 23 }
            },
          ],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 5, end: 6 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "h1", start: 6, end: 8 },
          close: { type: CLOSE_TAG_TOKEN, start: 23, end: 24 }
        },
      ],
    });
  });

  it("multiple attributes", () => {
    const value = "test";
    const ast = jsx`<input type="text" value=${value} disabled />`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "input",
          props: [
            { 
              name: "type", 
              type: STATIC_PROP, 
              value: "text", 
              quote: '"',
              nameToken: { type: IDENTIFIER_TOKEN, value: "type", start: 7, end: 11 },
              equalsToken: { type: EQUALS_TOKEN, start: 11, end: 12 },
              openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 12, end: 13 },
              valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "text", start: 13, end: 17 }],
              closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 17, end: 18 }
            },
            { 
              name: "value", 
              type: EXPRESSION_PROP, 
              value: 0,
              nameToken: { type: IDENTIFIER_TOKEN, value: "value", start: 19, end: 24 },
              equalsToken: { type: EQUALS_TOKEN, start: 24, end: 25 },
              expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 25, end: 25 }
            },
            { 
              name: "disabled", 
              type: BOOLEAN_PROP, 
              value: true,
              nameToken: { type: IDENTIFIER_TOKEN, value: "disabled", start: 26, end: 34 }
            },
          ],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "input", start: 1, end: 6 },
          slash: { type: SLASH_TOKEN, start: 35, end: 36 },
          close: { type: CLOSE_TAG_TOKEN, start: 36, end: 37 }
        },
      ],
    });
  });

  it("spread attribute with ...", () => {
    const id = "my-id";
    const ast = jsx`<div ...${id}></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [{ 
            type: SPREAD_PROP, 
            value: 0,
            spreadToken: { type: SPREAD_TOKEN, start: 5, end: 8 },
            expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 8, end: 8 }
          }],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 8, end: 9 }
        },
      ],
    });
  });
});

describe("whitespace handling", () => {
  it("preserves whitespace in text nodes in root", () => {
    const ast = jsx`  Hello <div>   Hello   World   </div> !   `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        { type: TEXT_NODE, value: "  Hello ", text: { type: TEXT_TOKEN, value: "  Hello ", start: 0, end: 8 } },
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: TEXT_NODE, value: "   Hello   World   ", text: { type: TEXT_TOKEN, value: "   Hello   World   ", start: 13, end: 32 } }],
          open: { type: OPEN_TAG_TOKEN, start: 8, end: 9 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 9, end: 12 },
          close: { type: CLOSE_TAG_TOKEN, start: 12, end: 13 }
        },
        { type: TEXT_NODE, value: " !   ", text: { type: TEXT_TOKEN, value: " !   ", start: 38, end: 43 } },
      ],
    });
  });

  it("trims leading and trailing whitespace-only text nodes at root", () => {
    const ast = jsx`
    <div>Hello World</div>
    `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: TEXT_NODE, value: "Hello World", text: { type: TEXT_TOKEN, value: "Hello World", start: 10, end: 21 } }],
          open: { type: OPEN_TAG_TOKEN, start: 5, end: 6 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 6, end: 9 },
          close: { type: CLOSE_TAG_TOKEN, start: 9, end: 10 }
        },
      ],
    });
  });

  it("preserves whitespace in text nodes", () => {
    const ast = jsx`<div>   Hello   World   </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: TEXT_NODE, value: "   Hello   World   ", text: { type: TEXT_TOKEN, value: "   Hello   World   ", start: 5, end: 24 } }],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
        },
      ],
    });
  });
  it("preserves whitespace in text nodes with elements", () => {
    const ast = jsx`<div>
       Hello World
       <span>!</span> 
       </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            {
              type: TEXT_NODE,
              value: `
       Hello World
       `,
              text: { type: TEXT_TOKEN, value: `
       Hello World
       `, start: 5, end: 32 }
            },
            {
              type: ELEMENT_NODE,
              name: "span",
              props: [],
              children: [{ type: TEXT_NODE, value: "!", text: { type: TEXT_TOKEN, value: "!", start: 38, end: 39 } }],
              open: { type: OPEN_TAG_TOKEN, start: 32, end: 33 },
              nameToken: { type: IDENTIFIER_TOKEN, value: "span", start: 33, end: 37 },
              close: { type: CLOSE_TAG_TOKEN, start: 37, end: 38 }
            },
          ],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
        },
      ],
    });
  });

  it("preserves whitespace in mixed text nodes", () => {
    const name = "User";
    const ast = jsx`<div>  Hello ${name}  !  </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            { type: TEXT_NODE, value: "  Hello ", text: { type: TEXT_TOKEN, value: "  Hello ", start: 5, end: 13 } },
            { type: EXPRESSION_NODE, value: 0, expression: { type: EXPRESSION_TOKEN, value: 0, start: 13, end: 13 } },
            { type: TEXT_NODE, value: "  !  ", text: { type: TEXT_TOKEN, value: "  !  ", start: 13, end: 18 } },
          ],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
        },
      ],
    });
  });

  it("trims whitespace-only text nodes around expressions", () => {
    const name = "User";
    const ast = jsx`<div>
      ${name}
    </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: EXPRESSION_NODE, value: 0, expression: { type: EXPRESSION_TOKEN, value: 0, start: 12, end: 12 } }],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
        },
      ],
    });
  });

  it("trims whitespace-only text nodes around expressions", () => {
    const name = "User";
    const ast = jsx`   ${name}   `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: TEXT_NODE,
          value: "   ",
          text: { type: TEXT_TOKEN, value: "   ", start: 0, end: 3 },
        },
        {
          type: EXPRESSION_NODE,
          value: 0,
          expression: { type: EXPRESSION_TOKEN, value: 0, start: 3, end: 3 },
        },
        {
          type: TEXT_NODE,
          value: "   ",
          text: { type: TEXT_TOKEN, value: "   ", start: 3, end: 6 },
        },
      ],
    });
  });

  it("filters only beginning and trailing whitespace in mixed text nodes", () => {
    const name = "User";
    const ast = jsx`<div>  ${"Hello"}  ${name}  !  </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            { type: EXPRESSION_NODE, value: 0, expression: { type: EXPRESSION_TOKEN, value: 0, start: 7, end: 7 } },
            { type: TEXT_NODE, value: "  ", text: { type: TEXT_TOKEN, value: "  ", start: 7, end: 9 } },
            { type: EXPRESSION_NODE, value: 1, expression: { type: EXPRESSION_TOKEN, value: 1, start: 9, end: 9 } },
            { type: TEXT_NODE, value: "  !  ", text: { type: TEXT_TOKEN, value: "  !  ", start: 9, end: 14 } },
          ],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
        },
      ],
    });
  });
});

describe("Complex Examples", () => {
  it("JSX with multiple expressions", () => {
    const title = "App";
    const content = "Hello";
    const count = 42;
    const ast = jsx`
      <div id="root">
        <h1>${title}</h1>
        <p>${content} - ${count}</p>
      </div>
    `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [{ 
            name: "id", 
            type: STATIC_PROP, 
            value: "root", 
            quote: '"',
            nameToken: { type: IDENTIFIER_TOKEN, value: "id", start: 12, end: 14 },
            equalsToken: { type: EQUALS_TOKEN, start: 14, end: 15 },
            openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 15, end: 16 },
            valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "root", start: 16, end: 20 }],
            closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 20, end: 21 }
          }],
          children: [
            {
              type: ELEMENT_NODE,
              name: "h1",
              props: [],
              children: [{ type: EXPRESSION_NODE, value: 0, expression: { type: EXPRESSION_TOKEN, value: 0, start: 35, end: 35 } }],
              open: { type: OPEN_TAG_TOKEN, start: 31, end: 32 },
              nameToken: { type: IDENTIFIER_TOKEN, value: "h1", start: 32, end: 34 },
              close: { type: CLOSE_TAG_TOKEN, start: 34, end: 35 }
            },
            {
              type: ELEMENT_NODE,
              name: "p",
              props: [],
              children: [
                { type: EXPRESSION_NODE, value: 1, expression: { type: EXPRESSION_TOKEN, value: 1, start: 52, end: 52 } },
                { type: TEXT_NODE, value: " - ", text: { type: TEXT_TOKEN, value: " - ", start: 52, end: 55 } },
                { type: EXPRESSION_NODE, value: 2, expression: { type: EXPRESSION_TOKEN, value: 2, start: 55, end: 55 } },
              ],
              open: { type: OPEN_TAG_TOKEN, start: 49, end: 50 },
              nameToken: { type: IDENTIFIER_TOKEN, value: "p", start: 50, end: 51 },
              close: { type: CLOSE_TAG_TOKEN, start: 51, end: 52 }
            },
          ],
          open: { type: OPEN_TAG_TOKEN, start: 7, end: 8 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 8, end: 11 },
          close: { type: CLOSE_TAG_TOKEN, start: 21, end: 22 }
        },
      ],
    });
  });

  it("list-like structure", () => {
    const items = ["a", "b", "c"];
    const ast = jsx`
      <ul>
        <li>${items[0]}</li>
        <li>${items[1]}</li>
        <li>${items[2]}</li>
      </ul>
    `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "ul",
          props: [],
          children: [
            {
              type: ELEMENT_NODE,
              name: "li",
              props: [],
              children: [{ type: EXPRESSION_NODE, value: 0, expression: { type: EXPRESSION_TOKEN, value: 0, start: 24, end: 24 } }],
              open: { type: OPEN_TAG_TOKEN, start: 20, end: 21 },
              nameToken: { type: IDENTIFIER_TOKEN, value: "li", start: 21, end: 23 },
              close: { type: CLOSE_TAG_TOKEN, start: 23, end: 24 }
            },
            {
              type: ELEMENT_NODE,
              name: "li",
              props: [],
              children: [{ type: EXPRESSION_NODE, value: 1, expression: { type: EXPRESSION_TOKEN, value: 1, start: 42, end: 42 } }],
              open: { type: OPEN_TAG_TOKEN, start: 38, end: 39 },
              nameToken: { type: IDENTIFIER_TOKEN, value: "li", start: 39, end: 41 },
              close: { type: CLOSE_TAG_TOKEN, start: 41, end: 42 }
            },
            {
              type: ELEMENT_NODE,
              name: "li",
              props: [],
              children: [{ type: EXPRESSION_NODE, value: 2, expression: { type: EXPRESSION_TOKEN, value: 2, start: 60, end: 60 } }],
              open: { type: OPEN_TAG_TOKEN, start: 56, end: 57 },
              nameToken: { type: IDENTIFIER_TOKEN, value: "li", start: 57, end: 59 },
              close: { type: CLOSE_TAG_TOKEN, start: 59, end: 60 }
            },
          ],
          open: { type: OPEN_TAG_TOKEN, start: 7, end: 8 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "ul", start: 8, end: 10 },
          close: { type: CLOSE_TAG_TOKEN, start: 10, end: 11 }
        },
      ],
    });
  });
});

describe("Specialized Element AST", () => {
  it("void elements: children", () => {
    const ast = jsx`<div><img src="test.png" >Children should get <span>wiped</span></img></div>`;

    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            {
              type: ELEMENT_NODE,
              name: "img",
              props: [
                {
                  name: "src",
                  type: STATIC_PROP,
                  value: "test.png",
                  quote: '"',
                  nameToken: { type: IDENTIFIER_TOKEN, value: "src", start: 10, end: 13 },
                  equalsToken: { type: EQUALS_TOKEN, start: 13, end: 14 },
                  openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 14, end: 15 },
                  valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "test.png", start: 15, end: 23 }],
                  closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 23, end: 24 }
                },
              ],
              children: [],
              open: { type: OPEN_TAG_TOKEN, start: 5, end: 6 },
              nameToken: { type: IDENTIFIER_TOKEN, value: "img", start: 6, end: 9 },
              close: { type: CLOSE_TAG_TOKEN, start: 25, end: 26 }
            },
          ],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
          close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
        },
      ],
    });
  });

  it("raw text elements: textarea ignoring content", () => {
    const ast = jsx`<textarea><div class="fake">${0}</div></textarea>`;

    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "textarea",
          props: [],
          children: [
            {
              type: TEXT_NODE,
              value: '<div class="fake">',
              text: { type: TEXT_TOKEN, value: '<div class="fake">', start: 10, end: 28 }
            },
            { type: EXPRESSION_NODE, value: 0, expression: { type: EXPRESSION_TOKEN, value: 0, start: 28, end: 28 } },
            {
              type: TEXT_NODE,
              value: "</div>",
              text: { type: TEXT_TOKEN, value: "</div>", start: 28, end: 34 }
            },
          ],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "textarea", start: 1, end: 9 },
          close: { type: CLOSE_TAG_TOKEN, start: 9, end: 10 }
        },
      ],
    });
  });

  it("complex mixed props in void elements", () => {
    const theme = "dark";
    const ast = jsx`<input class="btn ${theme}" disabled />`;

    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "input",
          props: [
            {
              name: "class",
              type: MIXED_PROP,
              value: ["btn ", 0],
              quote: '"',
              nameToken: { type: IDENTIFIER_TOKEN, value: "class", start: 7, end: 12 },
              equalsToken: { type: EQUALS_TOKEN, start: 12, end: 13 },
              openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 13, end: 14 },
              valueTokens: [
                { type: ATTRIBUTE_VALUE_TOKEN, value: "btn ", start: 14, end: 18 },
                { type: EXPRESSION_TOKEN, value: 0, start: 18, end: 18 }
              ],
              closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 18, end: 19 }
            },
            {
              name: "disabled",
              type: BOOLEAN_PROP,
              value: true,
              nameToken: { type: IDENTIFIER_TOKEN, value: "disabled", start: 20, end: 28 }
            },
          ],
          children: [],
          open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
          nameToken: { type: IDENTIFIER_TOKEN, value: "input", start: 1, end: 6 },
          slash: { type: SLASH_TOKEN, start: 29, end: 30 },
          close: { type: CLOSE_TAG_TOKEN, start: 30, end: 31 }
        },
      ],
    });
  });
});

describe("Edge Cases", () => {
  it("empty template", () => {
    const ast = jsx``;
    expect(ast).toEqual({ type: ROOT_NODE, children: [] });
  });
  it("only expressions", () => {
    const a = 1;
    const b = 2;
    const ast = jsx`${a}${b}`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        { type: EXPRESSION_NODE, value: 0, expression: { type: EXPRESSION_TOKEN, value: 0, start: 0, end: 0 } },
        { type: EXPRESSION_NODE, value: 1, expression: { type: EXPRESSION_TOKEN, value: 1, start: 0, end: 0 } },
      ],
    });
  });
});

describe("Errors", () => {
  it("error on open tag", () => {
    expect(() => jsx`<div`).toThrow();
  });

  it("error on mismatched tag", () => {
    expect(() => jsx`<div></span>`).toThrow();
  });

  it("error on extra <", () => {
    expect(() => jsx`<div><</span>`).toThrow();
  });

  it("error on bad tag name", () => {
    expect(() => jsx`<1div><</1div>`).toThrow();
  });

  it("error on unclosed tags", () => {
    expect(() => jsx`<div>`).toThrow();
  });

  it("error on spread without expression", () => {
    expect(() => jsx`<div ... bool></div>`).toThrow();
  });

  it("error on unmatched close", () => {
    expect(() => jsx`</div>`).toThrow();
  });
});

describe("Advanced Parser Edge Cases", () => {
  describe("Spread Attributes", () => {
    it("handles multiple spread attributes", () => {
      const props1 = { class: "first" };
      const props2 = { id: "second" };
      const ast = jsx`<div ...${props1} ...${props2}></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              { type: SPREAD_PROP, value: 0, spreadToken: { type: SPREAD_TOKEN, start: 5, end: 8 }, expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 8, end: 8 } },
              { type: SPREAD_PROP, value: 1, spreadToken: { type: SPREAD_TOKEN, start: 9, end: 12 }, expressionToken: { type: EXPRESSION_TOKEN, value: 1, start: 12, end: 12 } },
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 12, end: 13 }
          },
        ],
      });
    });

    it("handles spread with mixed other attributes", () => {
      const props = { class: "dynamic", "data-test": "value" };
      const ast = jsx`<div id="static" ...${props} required></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              { name: "id", type: STATIC_PROP, value: "static", quote: '"', nameToken: { type: IDENTIFIER_TOKEN, value: "id", start: 5, end: 7 }, equalsToken: { type: EQUALS_TOKEN, start: 7, end: 8 }, openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 8, end: 9 }, valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "static", start: 9, end: 15 }], closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 15, end: 16 } },
              { type: SPREAD_PROP, value: 0, spreadToken: { type: SPREAD_TOKEN, start: 17, end: 20 }, expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 20, end: 20 } },
              { name: "required", type: BOOLEAN_PROP, value: true, nameToken: { type: IDENTIFIER_TOKEN, value: "required", start: 21, end: 29 } },
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 29, end: 30 }
          },
        ],
      });
    });

    it("handles spread in quoted attribute context", () => {
      const props = { class: "test" };
      const ast = jsx`<div class="prefix-${props}-suffix"></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "class",
                type: MIXED_PROP,
                value: ["prefix-", 0, "-suffix"],
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "class", start: 5, end: 10 },
                equalsToken: { type: EQUALS_TOKEN, start: 10, end: 11 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 11, end: 12 },
                valueTokens: [
                  { type: ATTRIBUTE_VALUE_TOKEN, value: "prefix-", start: 12, end: 19 },
                  { type: EXPRESSION_TOKEN, value: 0, start: 19, end: 19 },
                  { type: ATTRIBUTE_VALUE_TOKEN, value: "-suffix", start: 19, end: 26 }
                ],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 26, end: 27 }
              },
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 27, end: 28 }
          },
        ],
      });
    });
  });

  describe("Complex Mixed Attributes", () => {
    it("handles multiple expressions in single attribute", () => {
      const firstName = "John";
      const lastName = "Doe";
      const ast = jsx`<div title="${firstName} ${lastName}"></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "title",
                type: MIXED_PROP,
                value: [0, " ", 1],
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "title", start: 5, end: 10 },
                equalsToken: { type: EQUALS_TOKEN, start: 10, end: 11 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 11, end: 12 },
                valueTokens: [
                  { type: EXPRESSION_TOKEN, value: 0, start: 12, end: 12 },
                  { type: ATTRIBUTE_VALUE_TOKEN, value: " ", start: 12, end: 13 },
                  { type: EXPRESSION_TOKEN, value: 1, start: 13, end: 13 }
                ],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 13, end: 14 }
              },
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 14, end: 15 }
          },
        ],
      });
    });

    it("handles complex mixed expressions with functions", () => {
      const getValue = () => "test";
      const prefix = "pre-";
      const ast = jsx`<div class="${prefix}${getValue()}"></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "class",
                type: MIXED_PROP,
                value: [0, 1],
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "class", start: 5, end: 10 },
                equalsToken: { type: EQUALS_TOKEN, start: 10, end: 11 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 11, end: 12 },
                valueTokens: [
                  { type: EXPRESSION_TOKEN, value: 0, start: 12, end: 12 },
                  { type: EXPRESSION_TOKEN, value: 1, start: 12, end: 12 }
                ],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 12, end: 13 }
              },
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 13, end: 14 }
          },
        ],
      });
    });

    it("handles attribute with only expressions", () => {
      const part1 = "hello";
      const part2 = "world";
      const ast = jsx`<div class="${part1}${part2}"></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "class",
                type: MIXED_PROP,
                value: [0, 1],
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "class", start: 5, end: 10 },
                equalsToken: { type: EQUALS_TOKEN, start: 10, end: 11 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 11, end: 12 },
                valueTokens: [
                  { type: EXPRESSION_TOKEN, value: 0, start: 12, end: 12 },
                  { type: EXPRESSION_TOKEN, value: 1, start: 12, end: 12 }
                ],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 12, end: 13 }
              },
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 13, end: 14 }
          },
        ],
      });
    });
  });

  describe("Special Tag Names and Namespaces", () => {
    it("handles custom elements with hyphens", () => {
      const ast = jsx`<my-custom-element attr="value"></my-custom-element>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "my-custom-element",
            props: [
              {
                name: "attr",
                type: STATIC_PROP,
                value: "value",
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "attr", start: 19, end: 23 },
                equalsToken: { type: EQUALS_TOKEN, start: 23, end: 24 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 24, end: 25 },
                valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "value", start: 25, end: 30 }],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 30, end: 31 }
              }
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "my-custom-element", start: 1, end: 18 },
            close: { type: CLOSE_TAG_TOKEN, start: 31, end: 32 }
          },
        ],
      });
    });

    it("handles namespaced tags", () => {
      const ast = jsx`<svg:rect x="10" y="20"></svg:rect>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "svg:rect",
            props: [
              {
                name: "x",
                type: STATIC_PROP,
                value: "10",
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "x", start: 10, end: 11 },
                equalsToken: { type: EQUALS_TOKEN, start: 11, end: 12 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 12, end: 13 },
                valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "10", start: 13, end: 15 }],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 15, end: 16 }
              },
              {
                name: "y",
                type: STATIC_PROP,
                value: "20",
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "y", start: 17, end: 18 },
                equalsToken: { type: EQUALS_TOKEN, start: 18, end: 19 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 19, end: 20 },
                valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "20", start: 20, end: 22 }],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 22, end: 23 }
              },
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "svg:rect", start: 1, end: 9 },
            close: { type: CLOSE_TAG_TOKEN, start: 23, end: 24 }
          },
        ],
      });
    });

    it("handles foreignObject in SVG", () => {
      const ast = jsx`<svg><foreignObject><div>HTML content</div></foreignObject></svg>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "svg",
            props: [],
            children: [
              {
                type: ELEMENT_NODE,
                name: "foreignObject",
                props: [],
                children: [
                  {
                    type: ELEMENT_NODE,
                    name: "div",
                    props: [],
                    children: [
                      { type: TEXT_NODE, value: "HTML content", text: { type: TEXT_TOKEN, value: "HTML content", start: 25, end: 37 } }
                    ],
                    open: { type: OPEN_TAG_TOKEN, start: 20, end: 21 },
                    nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 21, end: 24 },
                    close: { type: CLOSE_TAG_TOKEN, start: 24, end: 25 }
                  },
                ],
                open: { type: OPEN_TAG_TOKEN, start: 5, end: 6 },
                nameToken: { type: IDENTIFIER_TOKEN, value: "foreignObject", start: 6, end: 19 },
                close: { type: CLOSE_TAG_TOKEN, start: 19, end: 20 }
              },
            ],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "svg", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
          },
        ],
      });
    });
  });

  describe("Advanced Text and Expression Handling", () => {
    it("handles complex text with multiple adjacent expressions", () => {
      const items = ["a", "b", "c"];
      const separator = ", ";
      const ast = jsx`${items[0]}${separator}${items[1]}${separator}${items[2]}`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          { type: EXPRESSION_NODE, value: 0, expression: { type: EXPRESSION_TOKEN, value: 0, start: 0, end: 0 } },
          { type: EXPRESSION_NODE, value: 1, expression: { type: EXPRESSION_TOKEN, value: 1, start: 0, end: 0 } },
          { type: EXPRESSION_NODE, value: 2, expression: { type: EXPRESSION_TOKEN, value: 2, start: 0, end: 0 } },
          { type: EXPRESSION_NODE, value: 3, expression: { type: EXPRESSION_TOKEN, value: 3, start: 0, end: 0 } },
          { type: EXPRESSION_NODE, value: 4, expression: { type: EXPRESSION_TOKEN, value: 4, start: 0, end: 0 } },
        ],
      });
    });

    it("handles text with HTML entities", () => {
      const ast = jsx`<div>Use &lt; and &gt; for brackets</div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [],
            children: [
              { type: TEXT_NODE, value: "Use &lt; and &gt; for brackets", text: { type: TEXT_TOKEN, value: "Use &lt; and &gt; for brackets", start: 5, end: 35 } }
            ],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
          },
        ],
      });
    });

    it("handles text with numeric character references", () => {
      const ast = jsx`<div>Copyright &#169; 2023</div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [],
            children: [
              { type: TEXT_NODE, value: "Copyright &#169; 2023", text: { type: TEXT_TOKEN, value: "Copyright &#169; 2023", start: 5, end: 26 } }
            ],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 4, end: 5 }
          },
        ],
      });
    });
  });

  describe("Complex Nesting and Structure", () => {
    it("handles deeply nested structures", () => {
      const ast = jsx`
        <div>
          <section>
            <article>
              <header>
                <h1>Title</h1>
              </header>
              <main>
                <p>Content</p>
              </main>
              <footer>
                <small>Footer</small>
              </footer>
            </article>
          </section>
        </div>
      `;

      const divChild = ast.children[0] as any;
      const sectionChild = divChild.children[0] as any;
      const articleChild = sectionChild.children[0] as any;

      expect(articleChild.name).toBe("article");
      expect(articleChild.children.length).toBe(3);
    });

    it("handles sibling elements at root", () => {
      const ast = jsx`<div>First</div><span>Second</span><p>Third</p>`;

      expect(ast.children).toHaveLength(3);
      expect((ast.children[0] as any).name).toBe("div");
      expect((ast.children[1] as any).name).toBe("span");
      expect((ast.children[2] as any).name).toBe("p");
    });

    it("handles mixed text and elements at root", () => {
      const ast = jsx`Before<div>Element</div>After`;

      expect(ast.children).toHaveLength(3);
      expect((ast.children[0] as any).type).toBe(TEXT_NODE);
      expect((ast.children[1] as any).type).toBe(ELEMENT_NODE);
      expect((ast.children[2] as any).type).toBe(TEXT_NODE);
    });
  });

  describe("Void and Raw Text Elements", () => {
    it("handles void elements with attributes and self-closing syntax", () => {
      const ast = jsx`<img src="test.jpg" alt="Test Image" />`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "img",
            props: [
              {
                name: "src",
                type: STATIC_PROP,
                value: "test.jpg",
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "src", start: 5, end: 8 },
                equalsToken: { type: EQUALS_TOKEN, start: 8, end: 9 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 9, end: 10 },
                valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "test.jpg", start: 10, end: 18 }],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 18, end: 19 }
              },
              {
                name: "alt",
                type: STATIC_PROP,
                value: "Test Image",
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "alt", start: 20, end: 23 },
                equalsToken: { type: EQUALS_TOKEN, start: 23, end: 24 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 24, end: 25 },
                valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "Test Image", start: 25, end: 35 }],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 35, end: 36 }
              },
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "img", start: 1, end: 4 },
            slash: { type: SLASH_TOKEN, start: 37, end: 38 },
            close: { type: CLOSE_TAG_TOKEN, start: 38, end: 39 }
          },
        ],
      });
    });

    it("handles void elements without explicit slash", () => {
      const ast = jsx`<br></br>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "br",
            props: [],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "br", start: 1, end: 3 },
            close: { type: CLOSE_TAG_TOKEN, start: 3, end: 4 }
          },
        ],
      });
    });

    it("handles script element with complex content", () => {
      const ast = jsx`<script>
        function test() {
          return x < y && z > w;
        }
      </script>`;

      expect(((ast.children[0] as any).children[0] as any).value).toContain(
        "return x < y && z > w;",
      );
    });

    it("handles style element with CSS content", () => {
      const ast = jsx`<style>
        .class > .child { color: red; }
        @media (max-width: 768px) {
          .responsive { display: block; }
        }
      </style>`;

      const styleContent = ((ast.children[0] as any).children[0] as any).value;
      expect(styleContent).toContain(".class > .child");
      expect(styleContent).toContain("@media");
    });
  });

  describe("Attribute Namespaces and Special Props", () => {
    it("handles on: namespace for events", () => {
      const handler = () => {};
      const ast = jsx`<div on:click=${handler}></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "on:click",
                type: EXPRESSION_PROP,
                value: 0,
                nameToken: { type: IDENTIFIER_TOKEN, value: "on:click", start: 5, end: 13 },
                equalsToken: { type: EQUALS_TOKEN, start: 13, end: 14 },
                expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 14, end: 14 }
              }
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 14, end: 15 }
          },
        ],
      });
    });

    it("handles prop: and attr: namespaces", () => {
      const value = "test";
      const ast = jsx`<input prop:value=${value} attr:title="Title"></input>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "input",
            props: [
              {
                name: "prop:value",
                type: EXPRESSION_PROP,
                value: 0,
                nameToken: { type: IDENTIFIER_TOKEN, value: "prop:value", start: 7, end: 17 },
                equalsToken: { type: EQUALS_TOKEN, start: 17, end: 18 },
                expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 18, end: 18 }
              },
              {
                name: "attr:title",
                type: STATIC_PROP,
                value: "Title",
                quote: '"',
                nameToken: { type: IDENTIFIER_TOKEN, value: "attr:title", start: 19, end: 29 },
                equalsToken: { type: EQUALS_TOKEN, start: 29, end: 30 },
                openQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 30, end: 31 },
                valueTokens: [{ type: ATTRIBUTE_VALUE_TOKEN, value: "Title", start: 31, end: 36 }],
                closeQuote: { type: QUOTE_CHAR_TOKEN, value: '"', start: 36, end: 37 }
              },
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "input", start: 1, end: 6 },
            close: { type: CLOSE_TAG_TOKEN, start: 37, end: 38 }
          },
        ],
      });
    });

    it("handles ref attribute", () => {
      const ref = (el: HTMLElement) => {};
      const ast = jsx`<div ref=${ref}></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "ref",
                type: EXPRESSION_PROP,
                value: 0,
                nameToken: { type: IDENTIFIER_TOKEN, value: "ref", start: 5, end: 8 },
                equalsToken: { type: EQUALS_TOKEN, start: 8, end: 9 },
                expressionToken: { type: EXPRESSION_TOKEN, value: 0, start: 9, end: 9 }
              }
            ],
            children: [],
            open: { type: OPEN_TAG_TOKEN, start: 0, end: 1 },
            nameToken: { type: IDENTIFIER_TOKEN, value: "div", start: 1, end: 4 },
            close: { type: CLOSE_TAG_TOKEN, start: 9, end: 10 }
          },
        ],
      });
    });
  });

  describe("Error Recovery and Edge Cases", () => {
    it("handles attributes with special characters", () => {
      const ast = jsx`<div data-attr_with.special:chars="value"></div>`;

      expect(((ast.children[0] as any).props[0] as any).name).toBe("data-attr_with.special:chars");
    });

    it("handles unusual attribute values", () => {
      const ast = jsx`<div data-empty="" data-null="${null}" data-undefined="${undefined}"></div>`;

      expect(((ast.children[0] as any).props[0] as any).value).toBe("");
    });

    it("handles deeply nested spread and mixed attributes", () => {
      const baseProps = { class: "base", id: "test" };
      const additionalProps = { "data-info": "additional" };
      const dynamicClass = "dynamic";

      const ast = jsx`<div 
        class="static ${dynamicClass}"
        ...${baseProps}
        ...${additionalProps}
        id="override"
      ></div>`;

      const elementProps = (ast.children[0] as any).props;
      expect(elementProps).toHaveLength(4);
      expect(elementProps[0].type).toBe(MIXED_PROP);
      expect(elementProps[1].type).toBe(SPREAD_PROP);
      expect(elementProps[2].type).toBe(SPREAD_PROP);
      expect(elementProps[3].type).toBe(STATIC_PROP);
    });
  });
});
