import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { toJsxWithMappings, getJsxPosition } from "transform-jsx";
import { getJsxTemplateNodes, getJsxTemplateAtPosition } from "../src/finder";
import { getSemanticDiagnostics } from "../src/diagnostics";

function createSourceFile(text: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function createProgram(sourceFile: ts.SourceFile): ts.Program {
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.Latest };
  const host = ts.createCompilerHost(compilerOptions);
  return ts.createProgram([sourceFile.fileName], compilerOptions, host);
}

describe("position-mapping", () => {
  describe("toJsxWithMappings", () => {
    it("should convert basic template to JSX", () => {
      const code = "const a = jsx`<div>hello</div>`;";
      const result = toJsxWithMappings(code);
      expect(result.code).toContain("<div>hello</div>");
    });

    it("should convert template with expression to JSX", () => {
      const code = "const a = jsx`<div>${foo}</div>`;";
      const result = toJsxWithMappings(code);
      expect(result.code).toContain("{foo}");
    });

    it("should return mappings", () => {
      const code = "const a = jsx`<div>hello</div>`;";
      const result = toJsxWithMappings(code);
      expect(result.mappings).toBeDefined();
      expect(result.mappings.mappings).toBeDefined();
      expect(Array.isArray(result.mappings.mappings)).toBe(true);
    });

    it("should handle nested elements", () => {
      const code = "const a = jsx`<div><span>hello</span></div>`;";
      const result = toJsxWithMappings(code);
      expect(result.code).toContain("<span>");
      expect(result.code).toContain("</span>");
    });

    it("should handle self-closing elements", () => {
      const code = "const a = jsx`<br/>`;";
      const result = toJsxWithMappings(code);
      expect(result.code).toContain("<br />");
    });

    it("should handle multiple templates", () => {
      const code = "const a = jsx`<div>first</div>`; const b = jsx`<span>second</span>`;";
      const result = toJsxWithMappings(code);
      const parts = result.code.split("const b");
      expect(parts.length).toBe(2);
    });

    it("should handle attributes", () => {
      const code = 'const a = jsx`<div class="test" id="root"></div>`;';
      const result = toJsxWithMappings(code);
      expect(result.code).toContain('class="test"');
      expect(result.code).toContain('id="root"');
    });

    it("should handle expression attributes", () => {
      const code = "const a = jsx`<div class=${cls}></div>`;";
      const result = toJsxWithMappings(code);
      expect(result.code).toContain("class={cls}");
    });

    it("should handle spread attributes", () => {
      const code = "const a = jsx`<div ...${props}></div>`;";
      const result = toJsxWithMappings(code);
      expect(result.code).toContain("{...props}");
    });

    it("should handle empty template", () => {
      const code = "const a = jsx``;";
      const result = toJsxWithMappings(code);
      expect(result.code).toBeDefined();
    });
  });

  describe("getJsxPosition", () => {
    it("should map position from tagged to jsx", () => {
      const code = "const a = jsx`<div>hello</div>`;";
      const result = toJsxWithMappings(code);
      const taggedPosition = code.indexOf("div");
      const jsxPosition = getJsxPosition(taggedPosition, result.mappings.mappings, result.code.length);
      expect(jsxPosition).toBeDefined();
      expect(typeof jsxPosition).toBe("number");
    });

    it("should handle position 0", () => {
      const code = "const a = jsx`<div>hello</div>`;";
      const result = toJsxWithMappings(code);
      const jsxPosition = getJsxPosition(0, result.mappings.mappings, result.code.length);
      expect(jsxPosition).toBeDefined();
    });

    it("should handle position at end of code", () => {
      const code = "const a = jsx`<div>hello</div>`;";
      const result = toJsxWithMappings(code);
      const jsxPosition = getJsxPosition(code.length - 1, result.mappings.mappings, result.code.length);
      expect(jsxPosition).toBeDefined();
    });

    it("should return undefined for negative position", () => {
      const code = "const a = jsx`<div>hello</div>`;";
      const result = toJsxWithMappings(code);
      const jsxPosition = getJsxPosition(-1, result.mappings.mappings, result.code.length);
      expect(jsxPosition).toBeUndefined();
    });

    it("should return undefined for position beyond length", () => {
      const code = "const a = jsx`<div>hello</div>`;";
      const result = toJsxWithMappings(code);
      const jsxPosition = getJsxPosition(code.length + 100, result.mappings.mappings, result.code.length);
      expect(jsxPosition).toBeUndefined();
    });

    it("should handle position in expression", () => {
      const code = "const a = jsx`<div>${foo}</div>`;";
      const result = toJsxWithMappings(code);
      const fooIndex = code.indexOf("foo");
      const jsxPosition = getJsxPosition(fooIndex, result.mappings.mappings, result.code.length);
      expect(jsxPosition).toBeDefined();
    });
  });

  describe("integration: template to diagnostics", () => {
    it("should find jsx tagged template nodes", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
    });

    it("should find template at specific position", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const node = getJsxTemplateAtPosition(ts, sourceFile, 15);
      expect(node).toBeDefined();
    });

    it("should get full text from source file", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const fullText = sourceFile.getFullText();
      expect(fullText).toContain("jsx");
      expect(fullText).toContain("<div>");
    });

    it("should run diagnostics on template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should convert to JSX with mappings from source text", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const fullText = sourceFile.getFullText();
      const result = toJsxWithMappings(fullText);
      expect(result.code).toBeDefined();
      expect(result.mappings).toBeDefined();
    });

    it("should handle position conversion pipeline", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const fullText = sourceFile.getFullText();
      const result = toJsxWithMappings(fullText);
      
      const tagPosition = fullText.indexOf("<div>") + 1;
      const jsxPos = getJsxPosition(tagPosition, result.mappings.mappings, result.code.length);
      
      expect(jsxPos).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle code without jsx templates", () => {
      const code = "const a = `<div>hello</div>`;";
      const result = toJsxWithMappings(code);
      expect(result.code).toBe(code);
    });

    it("should handle mixed code with and without jsx", () => {
      const code = "const a = `<div>not jsx</div>`; const b = jsx`<div>jsx</div>`;";
      const result = toJsxWithMappings(code);
      expect(result.code).toContain("jsx");
    });

    it("should handle very long template", () => {
      const content = "a".repeat(1000);
      const code = `const a = jsx\`<div>${content}</div>\`;`;
      const result = toJsxWithMappings(code);
      expect(result.code.length).toBeLessThan(code.length);
    });

    it("should handle unicode characters", () => {
      const code = "const a = jsx`<div>héllo wörld</div>`;";
      const result = toJsxWithMappings(code);
      expect(result.code).toContain("héllo");
    });

    it("should handle special HTML characters", () => {
      const code = "const a = jsx`<div>&lt;test&gt;</div>`;";
      const result = toJsxWithMappings(code);
      expect(result.code.toLowerCase()).toContain("<div>");
    });
  });
});