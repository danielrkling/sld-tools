import { describe, it, expect } from "vitest";
import { toTagged, createJsxTransformer, createExpressionTransformCallbacks } from "../src/index";
import type * as ts from "typescript";

describe("createExpressionTransformCallbacks", () => {
  describe("attribute expressions", () => {
    it("should wrap expressions with () => in toTagged", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<div value={v()} />";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("value=${() => v()}");
    });

    it("should unwrap () => in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div value=${() => v()} />`";
      const result = customToJsx(tagged);
      expect(result).toContain("value={v()}");
    });

    it("should not transform ref prop in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div ref=${el} />`";
      const result = customToJsx(tagged);
      expect(result).toContain("ref={el}");
      expect(result).not.toContain("() =>");
    });

    it("should not transform event handlers (on*) in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div onClick=${handleClick} />`";
      const result = customToJsx(tagged);
      expect(result).toContain("onClick={handleClick}");
      expect(result).not.toContain("() =>");
    });

    it("should handle numeric and boolean primitives in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div count=${42} enabled=${true} />`";
      const result = customToJsx(tagged);
      expect(result).toContain("count={42}");
      expect(result).toContain("enabled={true}");
      expect(result).not.toContain("() =>");
    });

    it("should not unwrap arrow functions with parameters in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      // ref with arrow function should be skipped anyway, but test the logic
      const tagged = "jsx`<div ref=${e => e.id = 'myButton'} />`";
      const result = customToJsx(tagged);
      expect(result).toContain("ref={e => e.id = 'myButton'}");
      expect(result).not.toContain("() =>");
    });

    it("should not unwrap event handlers with arrow functions in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<button onClick=${() => console.log(1)}>Click</button>`";
      const result = customToJsx(tagged);
      // onClick should be skipped, so the arrow function stays
      expect(result).toContain("onClick={() => console.log(1)}");
      expect(result).not.toContain("() => () =>");
    });

    it("should not transform primitive values", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = '<div value={"something"} />';
      const result = toTagged(jsx, callbacks);
      expect(result).toContain('value=${"something"}');
      expect(result).not.toContain("() =>");
    });

    it("should not transform ref prop", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<div ref={el} />";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("ref=${el}");
      expect(result).not.toContain("() =>");
    });

    it("should not transform event handlers (on*)", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<div onClick={handleClick} />";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("onClick=${handleClick}");
      expect(result).not.toContain("() =>");
    });

    it("should handle numeric and boolean primitives", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<div count={42} enabled={true} />";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("count=${42}");
      expect(result).toContain("enabled=${true}");
      expect(result).not.toContain("() =>");
    });
  });

  describe("expression children (nodes)", () => {
    it("should wrap expression children with () => in toTagged", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<div>{v()}</div>";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("${() => v()}");
      expect(result).not.toContain("{v()}");
    });

    it("should unwrap () => for expression children in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div>${() => v()}</div>`";
      const result = customToJsx(tagged);
      expect(result).toContain("{v()}");
      expect(result).not.toContain("() =>");
    });

    it("should not transform primitive expression children", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = '<div>{"hello"}</div>';
      const result = toTagged(jsx, callbacks);
      expect(result).toContain('${"hello"}');
      expect(result).not.toContain("() =>");
    });

    it("should not transform numeric expression children", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<div>{42}</div>";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("${42}");
      expect(result).not.toContain("() =>");
    });

    it("should handle multiple expression children", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<div>{a()}{b()}</div>";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("${() => a()}");
      expect(result).toContain("${() => b()}");
    });

    it("should handle mixed primitive and expression children", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<div>text{a()}{42}</div>";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("${() => a()}");
      expect(result).toContain("${42}");
      expect(result).not.toContain("() => 42");
    });

    it("should not wrap array literals with () =>", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<For each={[1, 2, 3]}>test</For>";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("each=${[1, 2, 3]}");
      expect(result).not.toContain("() => [1, 2, 3]");
    });

    it("should not wrap existing arrow functions with () =>", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      // If already an arrow function, don't double-wrap
      const jsx = "<div value={() => v()} />";
      const result = toTagged(jsx, callbacks);
      // Should not double-wrap
      expect(result).not.toContain("() => () =>");
    });

    it("should handle arrow functions with parameters in ref prop", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      // ref prop should be skipped entirely
      const jsx = "<button ref={e => e.id = 'myButton'}>Click</button>";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("ref=${e => e.id = 'myButton'}");
      expect(result).not.toContain("() =>");
    });

    it("should handle arrow functions in event handlers", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      // onClick should be skipped (on* prop)
      const jsx = "<button onClick={() => console.log(1)}>Click</button>";
      const result = toTagged(jsx, callbacks);
      expect(result).toContain("onClick=${() => console.log(1)}");
      expect(result).not.toContain("() => () =>");
    });

    it("should wrap simple function calls in expression children", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);

      const jsx = "<button>Click ${window.location.hash}</button>";
      const result = toTagged(jsx, callbacks);
      // This is already an arrow function, should not be double-wrapped
      expect(result).not.toContain("() => () =>");
    });

    it("should unwrap expression children in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div>${() => v()}</div>`";
      const result = customToJsx(tagged);
      expect(result).toContain("{v()}");
      expect(result).not.toContain("() =>");
    });

    it("should not transform primitive expression children in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div>${42}</div>`";
      const result = customToJsx(tagged);
      expect(result).toContain("{42}");
      expect(result).not.toContain("() =>");
    });

    it("should not transform string expression children in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div>${'hello'}</div>`";
      const result = customToJsx(tagged);
      expect(result).toContain("{'hello'}");
      expect(result).not.toContain("() =>");
    });

        it("should not transform string expression children in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div>${'hello'}</div>`";
      const result = customToJsx(tagged);
      expect(result).toContain("{'hello'}");
      expect(result).not.toContain("() =>");
    });


    it("should handle multiple expression children in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div>${() => a()}${() => b()}</div>`";
      const result = customToJsx(tagged);
      expect(result).toContain("{a()}");
      expect(result).toContain("{b()}");
      expect(result).not.toContain("() =>");
    });

    it("should handle mixed primitive and expression children in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<div>text${() => a()}${42}</div>`";
      const result = customToJsx(tagged);
      expect(result).toContain("{a()}");
      expect(result).toContain("{42}");
      expect(result).not.toContain("() =>");
    });

    it("should not unwrap arrow functions with parameters in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<button ref=${e => e.id = 'myButton'}>Click</button>`";
      const result = customToJsx(tagged);
      // Should not unwrap since it has params
      expect(result).toContain("ref={e => e.id = 'myButton'}");
      expect(result).not.toContain("() =>");
    });

    it("should handle the complex button example in toJSX", () => {
      const ts = require("typescript") as typeof import("typescript");
      const callbacks = createExpressionTransformCallbacks(ts);
      const { toJsx: customToJsx } = createJsxTransformer(["jsx"], ts, callbacks);

      const tagged = "jsx`<button ref=${e => e.id = 'myButton'} onClick=${() => console.log(1)}>Click ${() => window.location.hash}</button>`";
      const result = customToJsx(tagged);
      expect(result).toContain("ref={e => e.id = 'myButton'}");
      expect(result).toContain("onClick={() => console.log(1)}");
      // window.location.hash was wrapped with () => in toTagged, so should be unwrapped in toJSX
      expect(result).toContain("{window.location.hash}");
      expect(result).not.toContain("() => window.location.hash");
    });
  });
});
