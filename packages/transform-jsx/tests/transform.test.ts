import { describe, it, expect } from "vitest";
import { sldToJsx, jsxToSld } from "../src/index";
import { readFileSync } from "fs";
import { join } from "path";

function readFixture(fixturePath: string): string {
  return readFileSync(fixturePath, "utf-8");
}

describe("sld-to-jsx", () => {
  const inputPath = join(__dirname, "fixtures", "sld-to-jsx", "input", "basic.ts");
  const expectedPath = join(__dirname, "fixtures", "sld-to-jsx", "output", "basic.tsx");

  it("transforms basic.ts to jsx", () => {
    const input = readFixture(inputPath);
    const expected = readFixture(expectedPath);
    const result = sldToJsx(input);
    expect(result).toBe(expected);
  });

  it("transforms single element", () => {
    const input = `const x = jsx\`<div>Hello</div>\`;`;
    const expected = `const x = <div>Hello</div>;`;
    expect(sldToJsx(input)).toBe(expected);
  });

  it("transforms multiple siblings to fragment", () => {
    const input = `const x = jsx\`<div>Hello</div><span>World</span>\`;`;
    const expected = `const x = <><div>Hello</div><span>World</span></>;`;
    expect(sldToJsx(input)).toBe(expected);
  });

  it("transforms self-closing tags", () => {
    const input = `const x = jsx\`<img src="test.png" />\`;`;
    const expected = `const x = <img src="test.png" />;`;
    expect(sldToJsx(input)).toBe(expected);
  });

  it("transforms dynamic expressions", () => {
    const input = `const name = "World"; const x = jsx\`<div>\${name}</div>\`;`;
    const expected = `const name = "World"; const x = <div>{name}</div>;`;
    expect(sldToJsx(input)).toBe(expected);
  });

  it("transforms dynamic attributes", () => {
    const input = `const cls = "active"; const x = jsx\`<div class=\${cls} />\`;`;
    const expected = `const cls = "active"; const x = <div class={cls} />;`;
    expect(sldToJsx(input)).toBe(expected);
  });

  it("unwraps arrow expressions in attributes", () => {
    const input = `const x = jsx\`<div class=\${() => myClass}>Hello</div>\`;`;
    const expected = `const x = <div class={myClass}>Hello</div>;`;
    expect(sldToJsx(input)).toBe(expected);
  });

  it("unwraps arrow expressions in children", () => {
    const input = `const x = jsx\`<div>\${() => name}</div>\`;`;
    const expected = `const x = <div>{name}</div>;`;
    expect(sldToJsx(input)).toBe(expected);
  });

  it("transforms boolean attributes", () => {
    const input = `const x = jsx\`<input disabled />\`;`;
    const expected = `const x = <input disabled />;`;
    expect(sldToJsx(input)).toBe(expected);
  });

  it("transforms nested elements", () => {
    const input = `const x = jsx\`<div><span>Hello</span></div>\`;`;
    const expected = `const x = <div><span>Hello</span></div>;`;
    expect(sldToJsx(input)).toBe(expected);
  });

  it("transforms event handlers", () => {
    const input = `const handler = () => {}; const x = jsx\`<button onClick=\${handler}>Click</button>\`;`;
    const expected = `const handler = () => {}; const x = <button onClick={handler}>Click</button>;`;
    expect(sldToJsx(input)).toBe(expected);
  });
});

describe("jsx-to-sld", () => {
  const inputPath = join(__dirname, "fixtures", "jsx-to-sld", "input", "basic.tsx");
  const expectedPath = join(__dirname, "fixtures", "jsx-to-sld", "output", "basic.ts");

  it("transforms basic.tsx to jsx template", () => {
    const input = readFixture(inputPath);
    const expected = readFixture(expectedPath);
    const result = jsxToSld(input);
    expect(result).toBe(expected);
  });

  it("transforms single element", () => {
    const input = `const x = <div>Hello</div>;`;
    const expected = `const x = jsx\`<div>Hello</div>\`;`;
    expect(jsxToSld(input)).toBe(expected);
  });

  it("transforms self-closing tags", () => {
    const input = `const x = <img src="test.png" />;`;
    const expected = `const x = jsx\`<img src="test.png" />\`;`;
    expect(jsxToSld(input)).toBe(expected);
  });

  it("wraps dynamic attributes in arrow functions", () => {
    const input = `const x = <div class={myClass}>Hello</div>;`;
    const expected = `const x = jsx\`<div class=\${() => myClass}>Hello</div>\`;`;
    expect(jsxToSld(input)).toBe(expected);
  });

  it("wraps dynamic children in arrow functions", () => {
    const input = `const x = <div>{name}</div>;`;
    const expected = `const x = jsx\`<div>\${() => name}</div>\`;`;
    expect(jsxToSld(input)).toBe(expected);
  });

  it("does not wrap primitive string attributes", () => {
    const input = `const x = <div class={"static"}>Hello</div>;`;
    const expected = `const x = jsx\`<div class=\${"static"}>Hello</div>\`;`;
    expect(jsxToSld(input)).toBe(expected);
  });

  it("does not wrap primitive number attributes", () => {
    const input = `const x = <div data-count={42}>Hello</div>;`;
    const expected = `const x = jsx\`<div data-count=\${42}>Hello</div>\`;`;
    expect(jsxToSld(input)).toBe(expected);
  });

  it("does not wrap primitive boolean attributes", () => {
    const input = `const x = <div data-active={true}>Hello</div>;`;
    const expected = `const x = jsx\`<div data-active=\${true}>Hello</div>\`;`;
    expect(jsxToSld(input)).toBe(expected);
  });

  it("wraps event handlers without arrow function", () => {
    const input = `const handler = () => {}; const x = <button onClick={handler}>Click</button>;`;
    const expected = `const handler = () => {}; const x = jsx\`<button onClick=\${handler}>Click</button>\`;`;
    expect(jsxToSld(input)).toBe(expected);
  });

  it("wraps ref without arrow function", () => {
    const input = `const ref = (el) => {}; const x = <div ref={ref}>Hello</div>;`;
    const expected = `const ref = (el) => {}; const x = jsx\`<div ref=\${ref}>Hello</div>\`;`;
    expect(jsxToSld(input)).toBe(expected);
  });
});

describe("tag configuration", () => {
  it("sldToJsx supports sld tag", () => {
    const input = `const x = sld\`<div>Hello</div>\`;`;
    const expected = `const x = <div>Hello</div>;`;
    expect(sldToJsx(input, { tags: ["sld"] })).toBe(expected);
  });

  it("sldToJsx supports jsx tag", () => {
    const input = `const x = jsx\`<div>Hello</div>\`;`;
    const expected = `const x = <div>Hello</div>;`;
    expect(sldToJsx(input, { tags: ["jsx"] })).toBe(expected);
  });

  it("jsxToSld supports sld tag output", () => {
    const input = `const x = <div>Hello</div>;`;
    const expected = `const x = sld\`<div>Hello</div>\`;`;
    expect(jsxToSld(input, { tag: "sld" })).toBe(expected);
  });

  it("jsxToSld supports jsx tag output", () => {
    const input = `const x = <div>Hello</div>;`;
    const expected = `const x = jsx\`<div>Hello</div>\`;`;
    expect(jsxToSld(input, { tag: "jsx" })).toBe(expected);
  });
});
