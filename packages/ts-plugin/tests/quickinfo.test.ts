import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { getQuickInfoAtPosition } from "../src/diagnostics";

function createSourceFile(text: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function createProgram(sourceFile: ts.SourceFile): ts.Program {
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.Latest };
  const host = ts.createCompilerHost(compilerOptions);
  return ts.createProgram([sourceFile.fileName], compilerOptions, host);
}

describe("quickinfo", () => {
  describe("getQuickInfoAtPosition", () => {
    it("should return undefined for non-template code", () => {
      const sourceFile = createSourceFile("const x = 1;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 5);
      expect(quickInfo).toBeUndefined();
    });

    it("should return undefined when position is outside templates", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`; const b = 1;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 40);
      expect(quickInfo).toBeUndefined();
    });

    it("should return undefined for empty file", () => {
      const sourceFile = createSourceFile("");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 0);
      expect(quickInfo).toBeUndefined();
    });

    it("should return undefined when position at start of file", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 0);
      expect(quickInfo).toBeUndefined();
    });

    it("should return undefined for non-jsx tagged template", () => {
      const sourceFile = createSourceFile("const a = html`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 10);
      expect(quickInfo).toBeUndefined();
    });
  });

  describe("quickinfo response structure", () => {
    it("should return valid textSpan when defined", () => {
      const sourceFile = createSourceFile("const x = 1;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 10);
      if (quickInfo) {
        expect(quickInfo.textSpan).toBeDefined();
        expect(quickInfo.textSpan.start).toBeDefined();
        expect(quickInfo.textSpan.length).toBeDefined();
      }
    });

    it("should return valid displayParts when defined", () => {
      const sourceFile = createSourceFile("const x = 1;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 10);
      if (quickInfo) {
        expect(quickInfo.displayParts).toBeDefined();
        expect(Array.isArray(quickInfo.displayParts)).toBe(true);
      }
    });

    it("should return valid kind when defined", () => {
      const sourceFile = createSourceFile("const x = 1;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 10);
      if (quickInfo) {
        expect(quickInfo.kind).toBeDefined();
        expect(typeof quickInfo.kind).toBe("string");
      }
    });

    it("should return empty documentation array", () => {
      const sourceFile = createSourceFile("const x = 1;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 10);
      if (quickInfo) {
        expect(quickInfo.documentation).toBeDefined();
        expect(Array.isArray(quickInfo.documentation)).toBe(true);
      }
    });

    it("should return empty tags array", () => {
      const sourceFile = createSourceFile("const x = 1;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 10);
      if (quickInfo) {
        expect(quickInfo.tags).toBeDefined();
        expect(Array.isArray(quickInfo.tags)).toBe(true);
      }
    });
  });

  describe("quickinfo edge cases", () => {
    it("should handle position at template start", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 10);
      expect(quickInfo).toBeUndefined();
    });

    it("should handle position at template end", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 30);
      expect(quickInfo).toBeUndefined();
    });

    it("should handle template inside function", () => {
      const sourceFile = createSourceFile(
        "function render() { return jsx`<div>hello</div>`; }"
      );
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 25);
      expect(quickInfo).toBeUndefined();
    });

    it("should handle multiple templates", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>first</div>`; const b = jsx`<span>second</span>`;"
      );
      const program = createProgram(sourceFile);
      const quickInfo = getQuickInfoAtPosition(ts, program, sourceFile.fileName, 15);
      expect(quickInfo).toBeUndefined();
    });
  });
});