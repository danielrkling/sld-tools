# @tagged-jsx/prettier-plugin

A Prettier plugin for formatting JSX content inside tagged template literals. Supports both Node.js and browser (Web) environments.

```js
// Before:
const el = html`<div
class=${cls}><span>hello</span></div>`

// After:
const el = html`<div class=${cls}>
  <span>hello</span>
</div>`
```

## Installation

```bash
npm install --save-dev @tagged-jsx/prettier-plugin
```

Requires `prettier` as a peer dependency (`^3.0.0`).

## Usage

### Prettier config (recommended)

```json
{
  "plugins": ["@tagged-jsx/prettier-plugin"],
  "embeddedJsxTags": ["jsx", "html"]
}
```

Then format normally:

```bash
npx prettier --write src/
```

### Programmatic API

```typescript
import { createPlugin } from "@tagged-jsx/prettier-plugin";
import prettier from "prettier";

const plugin = createPlugin(["jsx", "html"]);

const result = await prettier.format(source, {
  parser: "typescript",
  plugins: [plugin],
});
```

### Web / browser

For browser environments where `prettier/parser-typescript` and `prettier/parser-babel` are loaded separately:

```typescript
import { createPlugin } from "@tagged-jsx/prettier-plugin/web";
import prettier from "prettier/standalone";
import tsParser from "prettier/plugins/typescript";
import babelParser from "prettier/plugins/babel";

const plugin = createPlugin(["jsx", "html"]);

const result = await prettier.format(source, {
  parser: "typescript",
  plugins: [plugin, tsParser, babelParser],
});
```

## How it works

The plugin registers a custom Prettier printer that extends the `estree` AST format printer (via `prettier-plugin-embed`). When formatting, it:

1. **Walks the TypeScript/Babel AST** looking for `TaggedTemplateExpression` nodes
2. **Checks the tag name** against the configured tags (e.g., `jsx`, `html`)
3. **Extracts the template strings** from the `TemplateLiteral` quasi
4. **Tokenizes** the strings using `@tagged-jsx/parse`'s `tokenize()` function
5. **Parses** the tokens into an AST using `parse()`
6. **Prints** the AST back using Prettier's document builders (`group`, `indent`, `softline`, `hardline`, `ifBreak`)
7. **Embeds** the formatted result inside the original template literal, replacing the content

### Print logic

The plugin's `printJsx` function handles each node type:

**Elements:** Tag names are printed as-is (or as expressions for dynamic components via `${Component}`). Attributes are grouped and indented:

```
<tagName
  attr1="value1"
  attr2=${expression}
  ...${spread}
/>
```

**Children:** Text nodes are trimmed of excess whitespace. Elements on adjacent lines get `hardline` separators. Expression children (`${...}`) are preserved with their inner formatting delegated to the parent printer.

**Fragments:** Multiple root-level children are handled gracefully, with each child separated by line breaks.

**Line comments on attributes:** Line comments (`// comment`) appearing inline after an attribute are preserved on the same line. Comments on their own line remain on their own line.

**Self-closing elements:** Elements with no children or with explicit self-closing tokens render as `<tagName />` (with a space before `/>`).

### Expression handling

The plugin delegates expression formatting to Prettier's built-in `estree` printer via the `embed` API. This means `${someFunction(a, b)}` is formatted by Prettier's standard JavaScript printer, not by this plugin. The plugin only handles the JSX structural formatting around expressions.

## Formatting rules

**Inlined elements** (single child, no nested elements, few attributes):
```jsx
html`<div>${content}</div>`
```

**Broken elements** (multiple children, nested elements, 2+ attributes):
```jsx
html`<div class=${cls} id=${id}>
  <span>hello</span>
  ${content}
</div>`
```

**SolidJS control flow:**
```jsx
html`<${Show} when=${() => visible}>
  <p>${() => text}</p>
</${Show}>`
```

**SolidJS list rendering:**
```jsx
html`<ul>
  <${For} each=${() => items}>
    ${(item) => html`<li>${item}</li>`}
  </${For}>
</ul>`
```

**Self-closing:**
```jsx
html`<input type="text" disabled />`
```

**Dynamic tags:**
```jsx
html`<${Component} prop=${value}>
  ${children}
</${Component}>`
```

## License

MIT
