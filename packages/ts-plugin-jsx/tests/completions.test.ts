import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { getCompletionsAtPosition } from "../src/diagnostics";

function createSourceFile(text: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function createProgram(sourceFile: ts.SourceFile): ts.Program {
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.Latest };
  const host = ts.createCompilerHost(compilerOptions);
  return ts.createProgram([sourceFile.fileName], compilerOptions, host);
}

describe.skip("completions", () => {
  describe("getCompletionsAtPosition", () => {
    it("should return undefined when position is outside templates", () => {
      const sourceFile = createSourceFile("const a = 1;");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 0);
      expect(completions).toBeUndefined();
    });

    it("should return undefined for non-jsx code", () => {
      const sourceFile = createSourceFile("const x = 1;");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 10);
      expect(completions).toBeUndefined();
    });

    it("should return element completions after opening bracket", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      expect(completions).toBeDefined();
      expect(completions!.entries.length).toBeGreaterThan(0);
      expect(completions!.entries[0].name).toBe("div");
    });

    it("should return attribute completions after space in opening tag", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      expect(completions).toBeDefined();
      expect(completions!.entries.length).toBeGreaterThan(0);
      expect(completions!.entries[0].name).toBe("class");
    });

    it("should return attribute completions after tag name", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      expect(completions).toBeDefined();
      expect(completions!.entries.length).toBeGreaterThan(0);
      expect(completions!.entries[0].name).toBe("class");
    });

    it("should return element completions with expressions", () => {
      const sourceFile = createSourceFile("const a = jsx`<${\"tag\"}`;");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      expect(completions).toBeUndefined();
    });

    it("should not return completions in middle of text", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello world</div>`;");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 22);
      expect(completions).toBeUndefined();
    });

    it("should not return completions in middle of expression", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}</div>`;");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 18);
      expect(completions).toBeUndefined();
    });
  });

  describe("element completion entries", () => {
    it("should include common block elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("div");
      expect(names).toContain("span");
      expect(names).toContain("p");
      expect(names).toContain("ul");
      expect(names).toContain("ol");
      expect(names).toContain("li");
    });

    it("should include heading elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("h1");
      expect(names).toContain("h2");
      expect(names).toContain("h3");
      expect(names).toContain("h4");
      expect(names).toContain("h5");
      expect(names).toContain("h6");
    });

    it("should include form elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("form");
      expect(names).toContain("input");
      expect(names).toContain("button");
      expect(names).toContain("textarea");
      expect(names).toContain("select");
      expect(names).toContain("label");
    });

    it("should include self-closing elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("br");
      expect(names).toContain("hr");
      expect(names).toContain("img");
    });

    it("should include semantic elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("header");
      expect(names).toContain("footer");
      expect(names).toContain("nav");
      expect(names).toContain("main");
      expect(names).toContain("section");
      expect(names).toContain("article");
      expect(names).toContain("aside");
      expect(names).toContain("figure");
    });

    it("should include media elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("audio");
      expect(names).toContain("video");
      expect(names).toContain("source");
    });

    it("should include code elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("code");
      expect(names).toContain("pre");
      expect(names).toContain("blockquote");
    });

    it("should include table elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("table");
      expect(names).toContain("thead");
      expect(names).toContain("tbody");
      expect(names).toContain("tr");
      expect(names).toContain("td");
      expect(names).toContain("th");
    });

    it("should include svg element", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("svg");
      expect(names).toContain("iframe");
      expect(names).toContain("canvas");
    });
  });

  describe("attribute completion entries", () => {
    it("should include class and id", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("class");
      expect(names).toContain("id");
    });

    it("should include style", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("style");
    });

    it("should include event handlers", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("onClick");
      expect(names).toContain("onInput");
      expect(names).toContain("onChange");
    });

    it("should include input attributes", () => {
      const sourceFile = createSourceFile("const a = jsx`<input ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 24);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("value");
      expect(names).toContain("placeholder");
      expect(names).toContain("type");
    });

    it("should include input state attributes", () => {
      const sourceFile = createSourceFile("const a = jsx`<input ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 24);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("disabled");
      expect(names).toContain("readonly");
      expect(names).toContain("required");
      expect(names).toContain("checked");
      expect(names).toContain("selected");
    });

    it("should include image attributes", () => {
      const sourceFile = createSourceFile("const a = jsx`<img ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 22);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("src");
      expect(names).toContain("alt");
    });

    it("should include link attributes", () => {
      const sourceFile = createSourceFile("const a = jsx`<a ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 19);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("href");
      expect(names).toContain("target");
      expect(names).toContain("rel");
    });

    it("should include aria attributes", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("aria-label");
      expect(names).toContain("aria-describedby");
      expect(names).toContain("aria-hidden");
    });

    it("should include accessibility attributes", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("tabIndex");
      expect(names).toContain("accessKey");
      expect(names).toContain("contentEditable");
      expect(names).toContain("draggable");
      expect(names).toContain("role");
    });

    it("should include form attributes", () => {
      const sourceFile = createSourceFile("const a = jsx`<form ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 22);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("action");
      expect(names).toContain("method");
      expect(names).toContain("enctype");
      expect(names).toContain("autocomplete");
    });

    it("should include global attributes", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      const names = completions!.entries.map((e) => e.name);
      expect(names).toContain("title");
      expect(names).toContain("name");
    });
  });

  describe("completion metadata", () => {
    it("should set isGlobalCompletion to false", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      expect(completions!.isGlobalCompletion).toBe(false);
    });

    it("should set isMemberCompletion to false", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      expect(completions!.isMemberCompletion).toBe(false);
    });

    it("should set isNewIdentifierLocation to false", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      expect(completions!.isNewIdentifierLocation).toBe(false);
    });

    it("should set sortText to 0 for sorting", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      for (const entry of completions!.entries) {
        expect(entry.sortText).toBe("0");
      }
    });

    it("should set correct element kind", () => {
      const sourceFile = createSourceFile("const a = jsx`<");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 17);
      expect(completions!.entries[0].kind).toBe(ts.ScriptElementKind.classElement);
    });

    it("should set correct attribute kind", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 21);
      expect(completions!.entries[0].kind).toBe(ts.ScriptElementKind.memberVariableElement);
    });
  });

  describe("completions edge cases", () => {
    it("should return completions at position 0 after opening bracket", () => {
      const sourceFile = createSourceFile("jsx`<`");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 5);
      expect(completions).toBeDefined();
    });

    it("should handle position right after < character", () => {
      const sourceFile = createSourceFile("const a = jsx`<d");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 18);
      expect(completions).toBeDefined();
    });

    it("should handle attribute after existing attribute", () => {
      const sourceFile = createSourceFile("const a = jsx`<div class=\"test\" ");
      const program = createProgram(sourceFile);
      const completions = getCompletionsAtPosition(ts, program, sourceFile.fileName, 31);
      expect(completions).toBeDefined();
      expect(completions!.entries.length).toBeGreaterThan(0);
    });
  });
});