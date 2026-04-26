import * as prettier from "prettier";
import * as embedPlugin from "prettier-plugin-embed";
import plugin from "./dist/index.mjs";

async function test() {
  console.log("=== Basic Formatting Tests ===\n");

  const formatTests = [
    {
      name: "Self-closing tag gets space",
      input: `jsx\`<div/>\``,
      check: (s) => s.includes("<div />"),
    },
    {
      name: "Nested elements get newlines",
      input: `jsx\`<div><span>hello</span></div>\``,
      check: (s) => s.includes("<span>hello</span>") && s.includes("\n"),
    },
    {
      name: "Multiple siblings get newlines",
      input: `jsx\`<div><div>A</div><div>B</div><div>C</div></div>\``,
      check: (s) => s.includes("<div>A</div>") && s.split("\n").length >= 4,
    },
    {
      name: "Deep nesting has proper indentation",
      input: `jsx\`<div><section><article><span>text</span></article></section></div>\``,
      check: (s) => s.includes("<article>") && s.includes("</section>"),
    },
  ];

  for (const { name, input, check } of formatTests) {
    console.log(`--- ${name} ---`);
    const result = await prettier.format(input, {
      parser: "babel",
      plugins: [embedPlugin, plugin],
      printWidth: 40,
    });
    console.log("Input:", input);
    console.log("Output:", result.trim());
    console.log("PASS:", check(result) ? "✅" : "❌");
    console.log("");
  }

  console.log("=== Expression Tests ===\n");

  const expressionTests = [
    {
      name: "Expression in attribute",
      input: `jsx\`<div id={x} />\``,
      check: (s) => s.includes("id={x}"),
    },
    {
      name: "Expression in content",
      input: `jsx\`<div>{x}</div>\``,
      check: (s) => s.includes("{x}"),
    },
    {
      name: "Multiple expressions in content",
      input: `jsx\`<div>{a}{b}{c}</div>\``,
      check: (s) => s.includes("{a}") && s.includes("{c}"),
    },
    {
      name: "Mixed text and expression",
      input: `jsx\`<div>hello {world} test</div>\``,
      check: (s) => s.includes("hello") && s.includes("{world}") && s.includes("test"),
    },
    {
      name: "Expression with variable attr",
      input: `jsx\`<div className={cls} onClick={handleClick} />\``,
      check: (s) => s.includes("className={cls}") && s.includes("onClick={handleClick}"),
    },
  ];

  for (const { name, input, check } of expressionTests) {
    console.log(`--- ${name} ---`);
    const result = await prettier.format(input, {
      parser: "babel",
      plugins: [embedPlugin, plugin],
      printWidth: 40,
    });
    console.log("Input:", input);
    console.log("Output:", result.trim());
    console.log("PASS:", check(result) ? "✅" : "❌");
    console.log("");
  }

  console.log("=== Force Newlines with printWidth ===\n");

  const wrapTests = [
    {
      name: "Long attributes wrap",
      input: `jsx\`<VeryLongComponent veryLongPropA="valueA" veryLongPropB="valueB" />\``,
    },
    {
      name: "Many children wrap",
      input: `jsx\`<Container><Child /><Child /><Child /><Child /></Container>\``,
    },
  ];

  for (const { name, input } of wrapTests) {
    console.log(`--- ${name} (printWidth: 30) ---`);
    const result = await prettier.format(input, {
      parser: "babel",
      plugins: [embedPlugin, plugin],
      printWidth: 30,
    });
    console.log("Input:", input);
    console.log("Output:");
    console.log(result.trim());
    console.log("");
  }

  console.log("✅ All tests complete!");
}

test();