import { describe, it, expect } from "vitest";
import { toJsx, toJsxWithMappings, toTagged, toTaggedWithMappings, getJsxPosition, getTaggedPosition, computeMappings } from "../src/index";

describe("position mapping", () => {
  describe("toJsx result structure", () => {
    it("should return string code", () => {
      const result = toJsx("const x = jsx`<div></div>`;");
      expect(result).toBe("const x = <div></div>;");
    });

    it("should handle multiple templates", () => {
      const result = toJsx("const a = jsx`<div></div>`; const b = jsx`<span></span>`;");
      expect(result).toContain("<div></div>");
      expect(result).toContain("<span></span>");
    });
  });

  describe("toJsxWithMappings", () => {
    it("should return code and mappings", () => {
      const { code, mappings } = toJsxWithMappings("const x = jsx`<div></div>`;");
      expect(code).toBe("const x = <div></div>;");
      expect(mappings).toBeDefined();
      expect(mappings.mappings).toBeDefined();
      expect(mappings.reverseMappings).toBeDefined();
    });
  });

  describe("getJsxPosition", () => {
    it("should map start of file to start of output", () => {
      const { code, mappings } = toJsxWithMappings("const x = jsx`<div></div>`;");
      expect(getJsxPosition(0, mappings.mappings, code.length)).toBe(0);
    });

    it("should map positions before template correctly", () => {
      const { code, mappings } = toJsxWithMappings("const x = jsx`<div></div>`;");
      expect(getJsxPosition(5, mappings.mappings, code.length)).toBe(5);
    });

    it("should map position at end of template", () => {
      const input = "const x = jsx`<div></div>`;";
      const { code, mappings } = toJsxWithMappings(input);
      
      const templateEndPos = input.indexOf("`;");
      const mapped = getJsxPosition(templateEndPos, mappings.mappings, code.length);
      
      expect(code.charAt(mapped!)).toBe(";");
    });

    it("should map position inside template content", () => {
      const input = "const x = jsx`<div>hello</div>`;";
      const { code, mappings } = toJsxWithMappings(input);
      
      const divPos = input.indexOf("div");
      const mapped = getJsxPosition(divPos, mappings.mappings, code.length);
      
      expect(code.charAt(mapped!)).toBe("d");
    });

    it("should map ${ to {", () => {
      const input = "const x = jsx`<div>${name}</div>`;";
      const { code, mappings } = toJsxWithMappings(input);
      
      const exprStart = input.indexOf("${");
      const mapped = getJsxPosition(exprStart, mappings.mappings, code.length);
      
      expect(code.charAt(mapped!)).toBe("{");
    });

    it("should handle positions beyond file length", () => {
      const { code, mappings } = toJsxWithMappings("const x = jsx`<div></div>`;");
      expect(getJsxPosition(code.length + 100, mappings.mappings, code.length)).toBeUndefined();
    });

    it("should handle negative positions", () => {
      const { code, mappings } = toJsxWithMappings("const x = jsx`<div></div>`;");
      expect(getJsxPosition(-1, mappings.mappings, code.length)).toBeUndefined();
    });
  });

  describe("getTaggedPosition", () => {
    it("should map jsx position back to original position", () => {
      const input = "const x = jsx`<div></div>`;";
      const { code, mappings } = toJsxWithMappings(input);
      
      const jsxDivPos = code.indexOf("div");
      const reverseMapped = getTaggedPosition(jsxDivPos, mappings.reverseMappings, input.length);
      
      expect(reverseMapped).toBe(input.indexOf("div"));
    });

    it("should roundtrip position mapping", () => {
      const input = "const x = jsx`<div></div>`;";
      const { code, mappings } = toJsxWithMappings(input);
      
      const originalPos = input.indexOf("div");
      const toJsxPos = getJsxPosition(originalPos, mappings.mappings, code.length);
      const backToTagged = getTaggedPosition(toJsxPos!, mappings.reverseMappings, input.length);
      
      expect(backToTagged).toBe(originalPos);
    });
  });

  describe("toTagged mapping", () => {
    it("should return mappings for jsx to tagged conversion", () => {
      const { code, mappings } = toTaggedWithMappings("const x = <div></div>;");
      
      expect(code).toContain("jsx`");
      expect(mappings).toBeDefined();
    });

    it("should map jsx positions to tagged template positions", () => {
      const input = "const x = <div></div>;";
      const { code, mappings } = toTaggedWithMappings(input);
      
      const jsxDivPos = input.indexOf("div");
      const mapped = getJsxPosition(jsxDivPos, mappings.mappings, code.length);
      
      expect(code.charAt(mapped!)).toBe("d");
    });
  });

  describe("multiple templates", () => {
    it("should handle two templates with different content", () => {
      const input = "jsx`<div></div>`jsx`<span></span>`";
      const { code, mappings } = toJsxWithMappings(input);
      
      expect(mappings.mappings.length).toBeGreaterThanOrEqual(3);
      expect(getJsxPosition(0, mappings.mappings, code.length)).toBe(0);
      expect(getJsxPosition(15, mappings.mappings, code.length)).toBe(11);
      expect(getJsxPosition(16, mappings.mappings, code.length)).toBe(12);
    });
  });

  describe("computeMappings", () => {
    it("should compute mappings between two strings", () => {
      const oldCode = "const x = jsx`<div></div>`;";
      const newCode = "const x = <div></div>;";
      const { mappings, reverseMappings } = computeMappings(oldCode, newCode);
      
      expect(mappings.length).toBeGreaterThan(0);
      expect(reverseMappings.length).toBe(mappings.length);
    });
  });
});
