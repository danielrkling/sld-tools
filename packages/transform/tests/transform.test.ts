import { describe, it, expect } from "vitest";
import { toJsx, toTagged, createJsxTransformer } from "../src/index";
import { readFileSync } from "fs";
import { join } from "path";

const fixturesDir = join(__dirname, "fixtures");

function readJsx(file: string): string {
  return readFileSync(join(fixturesDir, "jsx", file), "utf-8");
}

function readTagged(file: string): string {
  return readFileSync(join(fixturesDir, "tagged", file), "utf-8");
}

describe("transforms", () => {
  describe("tagged to jsx", () => {
    it("basic file", () => {
      const input = readTagged("basic.ts");
      const expected = readJsx("basic.tsx");
      const result = toJsx(input);
      expect(result.trim()).toBe(expected.trim());
    });

    it("nested file", () => {
      const input = readTagged("nested.ts");
      const expected = readJsx("nested.tsx");
      const result = toJsx(input);
      expect(result).toBe(expected);
    });

    it("todo file (no callbacks)", () => {
      const input = readTagged("todo.ts");
      const expected = readJsx("todo.tsx").replace(/\r\n/g, '\n');
      const result = toJsx(input);
      expect(result).toBe(expected);
    });
  });

  describe("jsx to tagged", () => {
    it("basic file", () => {
      const input = readJsx("basic.tsx");
      const expected = readTagged("basic.ts");
      const result = toTagged(input);
      expect(result.trim()).toBe(expected.trim());
    });

    it("nested file", () => {
      const input = readJsx("nested.tsx");
      const expected = readTagged("nested.ts");
      const result = toTagged(input);
      expect(result).toBe(expected);
    });

    it("todo file (no callbacks)", () => {
      const input = readJsx("todo.tsx").replace(/\r\n/g, '\n');
      const expected = readTagged("todo.ts").replace(/\r\n/g, '\n');
      const result = toTagged(input);
      expect(result).toBe(expected);
    });
  });
});

describe("one-way transforms", () => {
  it("child fragments", () => {
    const jsx = "<div><></></div>";
    const expected = "jsx`<div></div>`";
    const result = toTagged(jsx);
    expect(result.trim()).toBe(expected.trim());
  });

  it("self-closing tags", () => {
    const jsx = "<div><img /></div>";
    const expected = "jsx`<div><img /></div>`";
    const result = toTagged(jsx);
    expect(result.trim()).toBe(expected.trim());
  });

  it("components", () => {
    const tagged = "jsx`<div><Button /></div>`";
    const expected = "jsx`<div><Button /></div>`";
    const result = toTagged(tagged);
    expect(result.trim()).toBe(expected.trim());
  });

  it("empty expressions", () => {
    const jsx = "<div>{}</div>";
    const expected = "jsx`<div></div>`";
    const result = toTagged(jsx);
    expect(result.trim()).toBe(expected.trim());
  });
});

describe("transform callbacks", () => {
  it("should transform expressions with toTagged callback", () => {
    const ts = require("typescript") as typeof import("typescript");

    const jsx = "<div value={v()} />";
    const result = toTagged(jsx, {
      toTagged: ({ expression, sourceCode }) => {
        const text = sourceCode.slice(expression.getStart(), expression.getEnd());
        return `() => ${text}`;
      }
    });
    expect(result).toContain("value=${() => v()}");
  });

  it("should transform expressions with toJSX callback", () => {
    const ts = require("typescript") as typeof import("typescript");
    const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, {
      toJSX: ({ expression, sourceCode }) => {
        const text = sourceCode.slice(expression.getStart(), expression.getEnd());
        return text.replace(/^\(\)\s*=>\s*/, "");
      }
    });

    const tagged = "jsx`<div value=${() => v()} />`";
    const result = customToJsx(tagged);
    expect(result).toContain("value={v()}");
  });

  it("should provide propName in callbacks", () => {
    const ts = require("typescript") as typeof import("typescript");
    let capturedPropName = "";
    toTagged("<div value={v()} />", {
      toTagged: ({ expression, propName, sourceCode }) => {
        capturedPropName = propName || "";
        const text = sourceCode.slice(expression.getStart(), expression.getEnd());
        return text;
      }
    });

    expect(capturedPropName).toBe("value");
  });
});
