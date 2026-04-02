import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { getJsxTemplateNodes, getJsxTemplateAtPosition, getTemplateStringsArray } from "../src/finder";
import { parseJsxTemplate } from "../src/parser";
import { getSemanticDiagnostics, getCompletionsAtPosition } from "../src/diagnostics";

function createSourceFile(text: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function createProgram(sourceFile: ts.SourceFile): ts.Program {
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.Latest };
  const host = ts.createCompilerHost(compilerOptions);
  return ts.createProgram([sourceFile.fileName], compilerOptions, host);
}

describe("finder", () => {
  describe("getJsxTemplateNodes", () => {
    it("should find jsx tagged templates", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`; const b = jsx`<span>world</span>`; const c = other`<div>not jsx</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(2);
    });

    it("should return empty array when no jsx templates", () => {
      const sourceFile = createSourceFile("const a = html`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(0);
    });

    it("should handle templates with simple content expressions", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].templateSpanExpressions).toHaveLength(1);
    });
  });

  describe("getJsxTemplateAtPosition", () => {
    it("should find template at position", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const node = getJsxTemplateAtPosition(ts, sourceFile, 15);
      expect(node).toBeDefined();
    });

    it("should return undefined when position is outside templates", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const node = getJsxTemplateAtPosition(ts, sourceFile, 0);
      expect(node).toBeUndefined();
    });
  });

  describe("getTemplateStringsArray", () => {
    it("should handle no substitution template literal", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      expect(result.strings).toEqual(["<div>hello</div>"]);
      expect(result.templateSpanExpressions).toHaveLength(0);
    });

    it("should handle template expressions", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      expect(result.strings).toEqual(["<div>", "</div>"]);
      expect(result.templateSpanExpressions).toHaveLength(1);
    });
  });
});

describe("parser", () => {
  describe("parseJsxTemplate", () => {
    it("should parse simple element", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const parsed = parseJsxTemplate(ts, sourceFile, nodes[0]);
      expect(parsed.root).toBeDefined();
      expect(parsed.root.children).toHaveLength(1);
    });

    it("should parse simple string attributes", () => {
      const sourceFile = createSourceFile('const a = jsx`<div class="foo">hello</div>`;');
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const parsed = parseJsxTemplate(ts, sourceFile, nodes[0]);
      expect(parsed.root.children[0]).toBeDefined();
    });

    it("should parse nested elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<div><span>hello</span></div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const parsed = parseJsxTemplate(ts, sourceFile, nodes[0]);
      expect(parsed.root.children).toHaveLength(1);
    });
  });
});

describe("diagnostics", () => {
  describe("getSemanticDiagnostics", () => {
    it("should return empty for valid templates", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it.skip("should return diagnostic for invalid JSX", () => {
      const sourceFile = createSourceFile("const a = jsx`<div class=>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe("getCompletionsAtPosition", () => {
    it.skip("should return element completions after <", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 18);
      expect(completions).toBeDefined();
      expect(completions?.entries.length).toBeGreaterThan(0);
      expect(completions?.entries[0].name).toBe("div");
    });

    it.skip("should return attribute completions after space", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 20);
      expect(completions).toBeDefined();
      expect(completions?.entries.length).toBeGreaterThan(0);
      expect(completions?.entries[0].name).toBe("class");
    });

    it("should return undefined when not in template", () => {
      const sourceFile = createSourceFile("const x = 1;");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 10);
      expect(completions).toBeUndefined();
    });
  });
});
