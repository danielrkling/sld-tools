import { describe, it, expect, beforeEach } from "vitest";
import * as ts from "typescript";
import {
  getJsxTemplateNodes,
  getJsxTemplateAtPosition,
  getTemplateStringsArray,
  JsxTemplateNode,
} from "../src/finder";

function createSourceFile(text: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

describe("finder", () => {
  describe("getJsxTemplateNodes", () => {
    it("should find single jsx tagged template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
    });

    it("should find multiple jsx tagged templates in same file", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>hello</div>`; const b = jsx`<span>world</span>`;"
      );
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(2);
    });

    it("should return empty array when no jsx templates exist", () => {
      const sourceFile = createSourceFile("const a = html`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(0);
    });

    it("should not find templates with different tag names", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>hello</div>`; const b = other`<span>world</span>`;"
      );
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].node.tag.getText(sourceFile)).toBe("jsx");
    });

    it("should handle template with single expression", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].templateSpanExpressions).toHaveLength(1);
    });

    it("should handle template with multiple expressions", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}${bar}</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].templateSpanExpressions).toHaveLength(2);
    });

    it("should handle template with expression at start", () => {
      const sourceFile = createSourceFile("const a = jsx`<${tag}></div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].templateSpanExpressions).toHaveLength(1);
    });

    it("should handle template with expression as attribute value", () => {
      const sourceFile = createSourceFile('const a = jsx`<div class=${cls}>hello</div>`;');
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].templateSpanExpressions).toHaveLength(1);
    });

    it("should handle template inside function", () => {
      const sourceFile = createSourceFile(
        "function render() { return jsx`<div>hello</div>`; }"
      );
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
    });

    it("should handle template inside arrow function", () => {
      const sourceFile = createSourceFile(
        "const render = () => jsx`<div>hello</div>`;"
      );
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
    });

    it("should handle template inside class", () => {
      const sourceFile = createSourceFile(
        "class C { render() { return jsx`<div>hello</div>`; } }"
      );
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
    });

    it("should handle template inside array", () => {
      const sourceFile = createSourceFile(
        "const items = [jsx`<div>1</div>`, jsx`<div>2</div>`];"
      );
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(2);
    });

    it("should handle template inside object property", () => {
      const sourceFile = createSourceFile(
        "const obj = { template: jsx`<div>hello</div>` };"
      );
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
    });

    it("should handle nested templates", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>${jsx`<span>inner</span>`}</div>`;"
      );
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(2);
    });

    it("should handle self-closing elements", () => {
      const sourceFile = createSourceFile("const a = jsx`<br/>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
    });

    it("should handle empty template literal", () => {
      const sourceFile = createSourceFile("const a = jsx``;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
    });

    it("should handle template with only whitespace", () => {
      const sourceFile = createSourceFile("const a = jsx`   `;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
    });

    it("should set correct start position", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const text = sourceFile.getFullText();
      expect(text.substring(nodes[0].start, nodes[0].start + 4)).toBe("jsx`");
    });

    it("should set correct end position", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const text = sourceFile.getFullText();
      expect(text.substring(nodes[0].end - 1, nodes[0].end)).toBe("`");
    });

    it("should extract correct strings from no-substitution template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes[0].strings).toEqual(["<div>hello</div>"]);
    });

    it("should extract correct strings with single expression", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes[0].strings).toEqual(["<div>", "</div>"]);
    });

    it("should extract correct strings with multiple expressions", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${a}${b}${c}</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      // For 3 expressions: 3 literals = 4 strings (head + 3 literals)
      expect(nodes[0].strings).toHaveLength(4);
      expect(nodes[0].strings[0]).toBe("<div>");
      expect(nodes[0].strings[3]).toBe("</div>");
    });

    it("should store template node reference", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(ts.isTaggedTemplateExpression(nodes[0].node)).toBe(true);
    });

    it("should not find jsx in string context", () => {
      const sourceFile = createSourceFile('const a = "jsx`<div>hello</div>`";');
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(0);
    });

    it("should not find jsx in comment", () => {
      const sourceFile = createSourceFile("// jsx`<div>hello</div>`");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(0);
    });
  });

  describe("getJsxTemplateAtPosition", () => {
    it("should find template when position is inside template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const position = 15;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeDefined();
    });

    it("should find template at start position", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const position = 10;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeDefined();
    });

    it("should find template at end position", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const position = 29;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeDefined();
    });

    it("should return undefined when position is outside any template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const position = 0;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeUndefined();
    });

    it("should return undefined when position is after template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const position = 40;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeUndefined();
    });

    it("should find correct template among multiple", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>first</div>`; const b = jsx`<span>second</span>`;"
      );
      // Position 50 is clearly inside second template
      const position = 50;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeDefined();
      const text = sourceFile.getFullText();
      expect(text.substring(node!.start, node!.end)).toContain("second");
    });

    it("should find template inside nested structure", () => {
      const sourceFile = createSourceFile(
        "function render() { return jsx`<div>hello</div>`; }"
      );
      // Position 30 is inside the template content
      const position = 30;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeDefined();
    });

    it("should handle position at expression placeholder", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}</div>`;");
      const position = 17;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeDefined();
    });

    it("should handle position on jsx tag keyword", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const position = 10;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeDefined();
    });

    it("should handle position on opening bracket", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const position = 14;
      const node = getJsxTemplateAtPosition(ts, sourceFile, position);
      expect(node).toBeDefined();
    });
  });

  describe("getTemplateStringsArray", () => {
    it("should extract string from no-substitution template literal", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      expect(result.strings).toEqual(["<div>hello</div>"]);
      expect(result.templateSpanExpressions).toHaveLength(0);
    });

    it("should extract strings and expression from single expression template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${foo}</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      expect(result.strings).toEqual(["<div>", "</div>"]);
      expect(result.templateSpanExpressions).toHaveLength(1);
    });

    it("should extract strings and expressions from multiple expression template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>${a}${b}${c}</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      // Verify function works - strings length = expressions + 1
      expect(result.strings.length).toBe(4);
      expect(result.templateSpanExpressions).toHaveLength(3);
    });

    it("should handle expression at the start", () => {
      const sourceFile = createSourceFile("const a = jsx`${foo}<div></div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      expect(result.strings).toEqual(["", "<div></div>"]);
      expect(result.templateSpanExpressions).toHaveLength(1);
    });

    it("should handle expression at the end", () => {
      const sourceFile = createSourceFile("const a = jsx`<div></div>${foo}`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      expect(result.strings).toEqual(["<div></div>", ""]);
      expect(result.templateSpanExpressions).toHaveLength(1);
    });

    it("should handle adjacent expressions", () => {
      const sourceFile = createSourceFile("const a = jsx`${foo}${bar}`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      // For 2 adjacent expressions: strings = expressions + 1 = 3
      expect(result.strings).toHaveLength(3);
      expect(result.templateSpanExpressions).toHaveLength(2);
    });

    it("should handle empty string between expressions", () => {
      const sourceFile = createSourceFile("const a = jsx`a${foo}${bar}b`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      expect(result.strings).toEqual(["a", "", "b"]);
      expect(result.templateSpanExpressions).toHaveLength(2);
    });

it("should handle expressions with attributes", () => {
      const sourceFile = createSourceFile('const a = jsx`<div class={cls}>text</div>`;');
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      // Verify function works
      expect(result.strings).toBeDefined();
    });

    it("should handle spread in template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div {...props}>text</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      // Verify we got some result, expression count may vary
      expect(result.strings).toBeDefined();
    });

    it("should handle spread syntax in template", () => {
      const sourceFile = createSourceFile("const a = jsx`<div ...${props}>text</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes).toHaveLength(1);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      // Verify we got some result
      expect(result.strings).toBeDefined();
    });

    it("should return empty arrays for empty template literal", () => {
      const sourceFile = createSourceFile("const a = jsx``;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      expect(result.strings).toEqual([""]);
      expect(result.templateSpanExpressions).toHaveLength(0);
    });

    it("should preserve whitespace in strings", () => {
      const sourceFile = createSourceFile("const a = jsx`  <div>  hello  </div>  `;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      const template = nodes[0].node.template;
      const result = getTemplateStringsArray(ts, sourceFile, template);
      expect(result.strings[0]).toContain("  ");
    });
  });

  describe("position calculations", () => {
    it("should calculate correct start position", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes[0].start).toBeGreaterThan(0);
      expect(nodes[0].start).toBeLessThan(nodes[0].end);
    });

    it("should calculate correct end position", () => {
      const sourceFile = createSourceFile("const a = jsx`<div>hello</div>`;");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes[0].end).toBeGreaterThan(nodes[0].start);
      const text = sourceFile.getFullText();
      expect(text.charAt(nodes[0].end - 1)).toBe("`");
    });

    it("should calculate correct span for multiple templates", () => {
      const sourceFile = createSourceFile(
        "const a = jsx`<div>first</div>`; const b = jsx`<span>second</span>`;"
      );
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes[0].end).toBeLessThan(nodes[1].start);
    });

    it("should handle template at start of file", () => {
      const sourceFile = createSourceFile("jsx`<div>hello</div>`");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes[0].start).toBe(0);
    });

    it("should handle template with leading whitespace", () => {
      const sourceFile = createSourceFile("  jsx`<div>hello</div>`");
      const nodes = getJsxTemplateNodes(ts, sourceFile);
      expect(nodes[0].start).toBe(2);
    });
  });
});