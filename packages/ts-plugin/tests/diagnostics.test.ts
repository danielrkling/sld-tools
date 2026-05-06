import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { createJsxTransformer, getTaggedPosition } from "@tagged-jsx/transform";

describe("ts-plugin diagnostics", () => {
  describe("transformer creation", () => {
    it("should create transformer with jsx tag", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      expect(toJsxWithMappings).toBeDefined();
    });

    it("should accept custom tags", () => {
      const { toJsxWithMappings } = createJsxTransformer(["html", "custom"], ts);
      const result = toJsxWithMappings("const x = html`<div></div>`");
      expect(result.code).toContain("<div></div>");
    });
  });

  describe("basic transformation", () => {
    it("should convert basic template to JSX", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const result = toJsxWithMappings("const x = jsx`<div>hello</div>`");
      expect(result.code).toContain("<div>hello</div>");
    });

    it("should return mappings structure", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const result = toJsxWithMappings("const x = jsx`<div></div>`");
      expect(result.mappings).toBeDefined();
      expect(result.mappings.mappings).toBeDefined();
      expect(result.mappings.reverseMappings).toBeDefined();
    });

    it("should handle nested elements", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const result = toJsxWithMappings("const x = jsx`<div><span>hi</span></div>`");
      expect(result.code).toContain("<span>hi</span>");
    });

    it("should handle self-closing tags", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const result = toJsxWithMappings("const x = jsx`<img />");
      expect(result.code).toContain("<img />");
    });

    it("should handle attributes", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const result = toJsxWithMappings('const x = jsx`<div class="foo"></div>`');
      expect(result.code).toContain('class="foo"');
    });

    it("should handle expression attributes", () => {
      const name = "test";
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const result = toJsxWithMappings(`const x = jsx\`<div class=\${name}></div>\``);
      expect(result.code).toContain("class={name}");
    });
  });

  describe("position mapping", () => {
    it("should provide getTaggedPosition function", () => {
      expect(getTaggedPosition).toBeDefined();
      expect(typeof getTaggedPosition).toBe("function");
    });

    it("should map positions when given valid inputs", () => {
      const code = "const x = jsx`<div>hello</div>`;";
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const { code: jsxCode, mappings } = toJsxWithMappings(code);
      
      const pos = getTaggedPosition(5, mappings.reverseMappings, jsxCode.length);
      expect(typeof pos).toBe("number");
    });

    it("should return undefined for out of bounds position", () => {
      const code = "const x = jsx`<div></div>`;";
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const { code: jsxCode, mappings } = toJsxWithMappings(code);
      
      const pos = getTaggedPosition(10000, mappings.reverseMappings, jsxCode.length);
      expect(pos).toBeUndefined();
    });

    it("should return undefined for negative position", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const { code, mappings } = toJsxWithMappings("const x = jsx`<div></div>`");
      
      const pos = getTaggedPosition(-1, mappings.reverseMappings, code.length);
      expect(pos).toBeUndefined();
    });
  });

  describe("non-template code", () => {
    it("should pass through non-template code unchanged", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const result = toJsxWithMappings("const x = 1;");
      expect(result.code).toBe("const x = 1;");
      expect(result.mappings.mappings.length).toBeGreaterThan(0);
    });

    it("should handle tagged call without jsx tag", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const result = toJsxWithMappings("const x = notjsx`<div></div>`");
      expect(result.code).toBe("const x = notjsx`<div></div>`");
    });
  });

  describe("error handling", () => {
    it("should throw on malformed JSX structure", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      expect(() => toJsxWithMappings("const x = jsx`<div><span></div>`")).toThrow();
    });

    it("should throw on invalid tag name", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      expect(() => toJsxWithMappings("const x = jsx`<></>`")).toThrow();
    });
  });

  describe("multiple templates in one file", () => {
    it("should handle multiple templates", () => {
      const { toJsxWithMappings } = createJsxTransformer(["jsx"], ts);
      const result = toJsxWithMappings("const a = jsx`<div></div>`; const b = jsx`<span></span>`");
      expect(result.code).toContain("<div></div>");
      expect(result.code).toContain("<span></span>");
    });
  });
});