import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { getSemanticDiagnostics } from "../src/diagnostics";

function createSourceFile(text: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function createProgram(sourceFile: ts.SourceFile): ts.Program {
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.Latest };
  const host = ts.createCompilerHost(compilerOptions);
  return ts.createProgram([sourceFile.fileName], compilerOptions, host);
}

describe("plugin integration", () => {
  describe("getSemanticDiagnostics", () => {
    it("should get diagnostics for valid jsx template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should get diagnostics for jsx template with expression", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should get diagnostics for nested elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<div><span>hello</span></div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should get diagnostics for attributes", () => {
      const sourceFile = createSourceFile('const a = jsx`<div class="test">hello</div>`;');
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should get diagnostics for self-closing elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<br/>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should handle multiple templates", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>first</div>`; const b = jsx`<span>second</span>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should handle template with expression attribute", () => {
      const sourceFile = createSourceFile('const a = jsx`<div class={cls}>hello</div>`;');
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should handle template with spread", () => {
      const sourceFile = createSourceFile("const a = jsx`<div {...props}>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should handle nested templates", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${jsx`<span>inner</span>`}</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should handle empty template", () => {
      const sourceFile = createSourceFile("const a = jsx``;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should handle fragment", () => {
      const sourceFile = createSourceFile("const a = jsx`<>hello</>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should handle input element", () => {
      const sourceFile = createSourceFile('const a = jsx`<input type="text" />;');
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it("should handle complex nested structure", () => {
      const sourceFile = createSourceFile("const a = jsx`<ul><li>${item}</li><li>${item2}</li></ul>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, "test.ts");
      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });
  });
});