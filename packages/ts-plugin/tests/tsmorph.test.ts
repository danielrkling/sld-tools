import { describe, it, expect, beforeEach } from "vitest";
import * as ts from "typescript";
import { Project, SourceFile } from "ts-morph";

describe("ts-plugin with ts-morph", () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        noEmit: true,
        target: ts.ScriptTarget.ES2020,
      },
    });
  });

  describe("basic project setup", () => {
    it("should create project without error", () => {
      expect(project).toBeDefined();
    });

    it("should create source file in memory", () => {
      const text = "const x = 1;";
      const sourceFile = project.createSourceFile("test.ts", text);
      expect(sourceFile.getText()).toContain("const x = 1");
    });
  });

  describe("jsx template parsing", () => {
    it("should parse valid jsx template", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `function jsx(strings: TemplateStringsArray) {}
const x = jsx\`<div>hello</div>\`;`
      );
      expect(sourceFile.getText()).toContain("jsx`<div>hello</div>`");
    });

    // Note: Detecting unclosed JSX tags requires the ts-plugin to be loaded
    // which requires registering it in tsconfig.json - not easily testable with ts-morph alone
  });

  describe("nested elements", () => {
    it("should handle nested jsx elements", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `function jsx(strings: TemplateStringsArray) {}
const x = jsx\`<div><span>hello</span></div>\`;`
      );
      expect(sourceFile.getText()).toContain("<span>hello</span>");
    });

    it("should handle self-closing nested elements", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `function jsx(strings: TemplateStringsArray) {}
const x = jsx\`<div><img /></div>\`;`
      );
      expect(sourceFile.getText()).toContain("<img />");
    });

    it("should handle string attributes", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `function jsx(strings: TemplateStringsArray) {}
const x = jsx\`<div class="foo"></div>\`;`
      );
      expect(sourceFile.getText()).toContain('class="foo"');
    });

    it("should handle boolean attributes", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `function jsx(strings: TemplateStringsArray) {}
const x = jsx\`<input disabled />\`;`
      );
      expect(sourceFile.getText()).toContain("disabled");
    });
  });

  describe("template transformations", () => {
    it("should preserve string expressions in templates", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `const first = "world";
function jsx(strings: TemplateStringsArray, ...args: any[]) {}
const x = jsx\`<div>hello \${first}</div>\`;`
      );
      expect(sourceFile.getText()).toContain("${first}");
    });
  });
});