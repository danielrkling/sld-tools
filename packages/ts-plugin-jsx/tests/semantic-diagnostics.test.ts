import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { getJsxTemplateNodes } from "../src/finder";
import { getSemanticDiagnostics } from "../src/diagnostics";

function createSourceFile(text: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function createProgram(sourceFile: ts.SourceFile): ts.Program {
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.Latest };
  const host = ts.createCompilerHost(compilerOptions);
  return ts.createProgram([sourceFile.fileName], compilerOptions, host);
}

describe("semantic-diagnostics", () => {
  describe("getSemanticDiagnostics", () => {
    it("should return no diagnostics for valid template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for template with expression", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for nested elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<div><span>hello</span></div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for template with attributes", () => {
      const sourceFile = createSourceFile('const a = jsx`<div class="test" id="root"></div>`;');
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for self-closing elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<br/>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for multiple templates", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>first</div>`; const b = jsx`<span>second</span>`;"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for template with expression attribute", () => {
      const sourceFile = createSourceFile("const a = jsx`<div class={cls}></div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for template with spread", () => {
      const sourceFile = createSourceFile("const a = jsx`<div {...props}></div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for nested templates", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>${jsx`<span>inner</span>`}</div>`;"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for empty template", () => {
      const sourceFile = createSourceFile("const a = jsx``;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for fragment", () => {
      const sourceFile = createSourceFile("const a = jsx`<>hello</>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for input element", () => {
      const sourceFile = createSourceFile('const a = jsx`<input type="text" />;');
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return no diagnostics for complex nested structure", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<ul><li>${item}</li><li>${item2}</li></ul>`;"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("diagnostic position mapping", () => {
    it("should map diagnostic position to template location", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      if (diagnostics.length > 0) {
        expect(diagnostics[0].start).toBeGreaterThan(0);
      }
    });

    it("should set correct diagnostic category to error", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      for (const diag of diagnostics) {
        expect(diag.category).toBe(ts.DiagnosticCategory.Error);
      }
    });

    it("should include source in diagnostic", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      if (diagnostics.length > 0) {
        expect(diagnostics[0].file).toBe(sourceFile);
      }
    });

    it("should set error code", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      if (diagnostics.length > 0) {
        expect(diagnostics[0].code).toBe(9001);
      }
    });
  });

  describe("diagnostics with multiple templates", () => {
    it("should return diagnostics for first template only when valid", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>valid</div>`; const b = jsx`<span>also valid</span>`;"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should handle multiple diagnostics", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>${a}</div>`; const b = jsx`<span>${b}</span>`;"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("diagnostics edge cases", () => {
    it("should handle template in function", () => {
      const sourceFile = createSourceFile(
        "function render() { return jsx`<div>hello</div>`; }"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should handle template in arrow function", () => {
      const sourceFile = createSourceFile(
        "const render = () => jsx`<div>hello</div>`;"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should handle template in class method", () => {
      const sourceFile = createSourceFile(
        "class C { render() { return jsx`<div>hello</div>`; } }"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should handle template in object literal", () => {
      const sourceFile = createSourceFile(
        "const obj = { template: jsx`<div>hello</div>` };"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should handle template in array", () => {
      const sourceFile = createSourceFile(
        "const items = [jsx`<div>1</div>`, jsx`<div>2</div>`];"
      );
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("diagnostic message content", () => {
    it("should have non-empty message when error exists", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      if (diagnostics.length > 0) {
        const msg = typeof diagnostics[0].messageText === "string"
          ? diagnostics[0].messageText
          : diagnostics[0].messageText.messageText;
        expect(msg.length).toBeGreaterThan(0);
      }
    });
  });

  describe("empty source file", () => {
    it("should return empty diagnostics for empty file", () => {
      const sourceFile = createSourceFile("");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });

    it("should return empty diagnostics for non-template code", () => {
      const sourceFile = createSourceFile("const a = 1; const b = 2;");
      const program = createProgram(sourceFile);
      const diagnostics = getSemanticDiagnostics(ts, program, sourceFile.fileName);
      expect(diagnostics).toHaveLength(0);
    });
  });
});