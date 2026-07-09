# @tagged-jsx/ts-plugin

TypeScript language service plugin that provides **real-time diagnostics** for JSX syntax inside tagged template literals. Surface semantic errors, type checking, and IntelliSense for template expressions like `` html`<div>${content}</div>` `` directly in your editor.

No build step required — the plugin rewrites templates to JSX on the fly inside the language service.

## How it works

The plugin hooks into the TypeScript language service by creating a proxy that intercepts language service calls. For each file the user opens or edits, it:

1. **Finds** all tagged templates matching configured tags (e.g., `` html`...` ``)
2. **Rewrites** each template to valid JSX using `@tagged-jsx/transform`
3. **Creates** a synthetic TypeScript language service with the rewritten source
4. **Forwards** language service calls (diagnostics, completions, quick info, rename, etc.) to the synthetic service
5. **Maps** all positions back to the original template literal positions using character-level offset mapping

This means TypeScript's type checker sees:

```
// What you write:
html`<div class=${active ? "on" : "off"}>
  <${MyComponent}>${children}</${MyComponent}>
</div>`

// What TypeScript sees (in-memory, via the plugin):
<div class={active ? "on" : "off"}>
  <MyComponent>{children}</MyComponent>
</div>
```

Diagnostics (type errors, missing props, etc.) are then mapped back to the correct positions in your original template literal source.

## Installation

```bash
npm install --save-dev @tagged-jsx/ts-plugin
```

## Configuration

Add the plugin to your `tsconfig.json`. For SolidJS projects, configure JSX with Solid's import source:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxImportSource": "solid-js",
    "plugins": [
      {
        "name": "@tagged-jsx/ts-plugin",
        "tags": ["html", "jsx"],
        "useCallbacks": true
      }
    ]
  }
}
```

After changing tsconfig, restart your TS server in VS Code (`TypeScript: Restart TS Server`).

### Plugin options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tags` | `string[]` | `["jsx"]` | Tag names to treat as JSX tagged templates |
| `useCallbacks` | `boolean` | `false` | Enable expression transform callbacks |

### `tags`

Controls which tagged template identifiers trigger JSX parsing:

```json
{ "tags": ["jsx", "html", "css"] }
```

All matching templates in your source files will be checked for JSX diagnostics.

### `useCallbacks`

When enabled, expressions are wrapped with `() =>` during the tagged→JSX conversion and unwrapped on the reverse path. This matches the semantics of SolidJS-style reactive template libraries where interpolated values are treated as lazy thunks.

**Without callbacks** (default):
```typescript
// Tagged template
html`<div class=${activeClass}>${content}</div>`

// Diagnostics will be checked against:
<div class={activeClass}>{content}</div>
```

**With callbacks** (`useCallbacks: true`):
```typescript
// Tagged template (SolidJS reactive):
html`<div class=${() => activeClass}>${() => content()}</div>`

// The plugin unwraps () => before checking diagnostics:
<div class={activeClass}>{content()}</div>
// then back-maps diagnostics to:
html`<div class=${() => activeClass}>${() => content()}</div>`
// Callbacks handle the () => wrapping for reactive frameworks
```

## How diagnostics are mapped

The plugin uses the mapping system from `@tagged-jsx/transform` to translate positions. When TypeScript reports an error at position X in the JSX output, the plugin:

1. Looks up the reverse mapping for position X
2. Finds the corresponding position in the original tagged template source
3. Returns the mapped diagnostic to the editor

This means error squiggles, hover info, and quick fixes all appear at the correct locations in your template literals.

## Proxied language service methods

The plugin proxies the following methods through the synthetic JSX language service, with automatic position remapping:

| Method | Description |
|--------|-------------|
| `getSemanticDiagnostics` | Type errors, missing props, etc. mapped to original template positions |
| `getCompletionsAtPosition` | JSX attribute and element name completions inside templates |
| `getCompletionEntryDetails` | Detail info for completion entries |
| `getQuickInfoAtPosition` | Hover type information |
| `getSignatureHelpItems` | Signature help for JSX attributes |
| `getOutliningSpans` | Code folding regions |
| `getDefinitionAtPosition` | Go to definition |
| `getImplementationAtPosition` | Go to implementation |
| `getTypeDefinitionAtPosition` | Go to type definition |
| `findReferences` | Find all references |
| `getRenameInfo` / `findRenameLocations` | F2 rename support for components |
| `getNavigationBarItems` | Document symbol outline |

## Limitations

- The synthetic language service does not have access to the full project context (type resolution is limited to the single file being checked)
- Complex type dependencies across files may not resolve in synthetic diagnostics
- Completions match JSX fidelity — entries that do not originate from real JSX attribute positions are not included

## License

MIT
