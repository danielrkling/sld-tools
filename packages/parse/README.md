# JSX-like Template Parser

A lightweight, high-performance, two-pass tokenizer and parser for processing JSX-like template strings with embedded JavaScript expressions.

This library is designed for speed and a small bundle size, making it ideal for template engines, static site generators, or any tool that needs to deconstruct a string into a structured Abstract Syntax Tree (AST). It uses a state-machine-based tokenizer and a single-pass, stack-based parser.

## Features

-   **High-Performance Tokenizer**: Uses `charCodeAt` and a state machine for fast, efficient tokenization.
-   **Robust Parser**: Builds a complete Abstract Syntax Tree (AST) in a single pass over the tokens.
-   **Expression Support**: Natively handles embedded expressions (e.g., `${...}`).
-   **Attribute Variety**: Parses boolean attributes, static key/value attributes, and attributes with embedded expressions.
-   **Special Element Handling**: Configurable support for `void` elements (e.g., `<input>`) and `raw text` elements (e.g., `<script>`, `<style>`).
-   **Whitespace Control**: Intelligently removes superfluous whitespace between elements while preserving meaningful text nodes.
-   **Zero Dependencies**: Written in pure TypeScript with no external libraries.

## Strict Syntax

This parser enforces strict syntax rules for robustness:

-   **Valid Attributes**: Only these forms are allowed:
    -   Boolean: `disabled`
    -   String: `class="container"`
    -   Expression: `id=${postId}`
    -   Spread: `...${props}`
-   **Identifier Rules**: Tag and attribute names must start with a letter, `_`, or `$`, and can contain letters, digits, `_`, `-`, `.`, or `:`.
-   **Quotes Required**: String attribute values must be quoted (`"` or `'`).
-   **Descriptive Errors**: All errors include position information for easy debugging.

## Installation

```bash
npm install parse-jsx
```

## Usage

The library exports two main functions: `tokenize` and `parse`. You typically use them together to convert a template string into an AST.

```typescript
import { tokenize, parse } from './your-parser-library';

// 1. Define your template string with expressions.
// NOTE: This example uses a tagged template literal, which is what the
// tokenizer expects. The values from expressions are not used directly,
// but their positions are captured.
const template = (strings, ...values) => ({ strings, values });
const myTemplate = template`<div class="container ${'dynamicClass'}">
  <h1>Hello, World!</h1>
  <input type="text" disabled>
  <p>This is a template literal.</p>
</div>`;

// 2. Define which elements are considered "void" (self-closing).
const voidElements = new Set(['input', 'br', 'hr', 'img']);

// 3. Define which elements contain raw text that should not be parsed.
const rawTextElements = new Set(['script', 'style']);

// 4. Tokenize the input string.
const tokens = tokenize(myTemplate.strings, rawTextElements);

// 5. Parse the tokens into an AST.
const ast = parse(tokens, voidElements);

// 6. Log the result.
console.log(JSON.stringify(ast, null, 2));
```

### The AST Structure

The `parse` function returns a `RootNode` which contains an array of child nodes. The structure is designed to be simple and easy to traverse.

**Example AST for `<div class="container" id=${"myId"}>Hello</div>`:**

```json
{
  "type": 0,
  "children": [
    {
      "type": 1,
      "name": "div",
      "props": [
        {
          "type": 1,
          "name": "class",
          "value": "container"
        },
        {
          "type": 2,
          "name": "id",
          "value": 0
        }
      ],
      "children": [
        {
          "type": 2,
          "value": "Hello"
        }
      ]
    }
  ]
}
```

**Node Types:**

-   `0` (ROOT_NODE): The top-level node.
-   `1` (ELEMENT_NODE): An HTML-like element with a tag name, props, and children.
-   `2` (TEXT_NODE): A plain text node.
-   `3` (EXPRESSION_NODE): A placeholder for a dynamic expression (e.g., `${name}`).

## How It Works

The library operates in two distinct phases for maximum efficiency and separation of concerns.

1.  **Tokenization**: The `tokenize` function scans the input string and breaks it down into a flat array of `Token` objects. It uses a finite state machine to switch between different contexts (text, tags, attributes) and `charCodeAt` for fast character analysis. This avoids the overhead of regular expressions.

2.  **Parsing**: The `parse` function consumes the array of tokens and builds the hierarchical AST. It uses a stack to keep track of the current parent element, allowing it to correctly handle nested structures. It processes the tokens in a single pass, creating element nodes, text nodes, and attaching props as it goes.

## API Reference

### `tokenize(strings)`

-   **`strings`**: `TemplateStringsArray`. The array of strings from a tagged template literal.
-   **Returns**: `Token[]`. An array of token objects.

### Token Structure (Dev Mode)

Each token contains:
-   **`type`**: Numeric token type
-   **`segment`**: Which string in the template literal (0, 1, 2...)
-   **`start`**: Position within that segment
-   **`end`**: End position within that segment
-   **`value`**: For text/identifier tokens, the text content; for expression tokens, the expression index

### `parse(tokens)`

-   **`tokens`**: `Token[]`. The array of tokens generated by the `tokenize` function.
-   **Returns**: `RootNode`. The root of the generated Abstract Syntax Tree.

## Contributing

Contributions are welcome! If you find a bug or have a suggestion for improvement, please open an issue or submit a pull request.

## License

[MIT](LICENSE)