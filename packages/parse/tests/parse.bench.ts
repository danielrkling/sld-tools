import { describe, bench } from "vitest";
import { tokenize, parse } from "../src/index";

import {parse as parse2} from "./html-parse-string.mjs"

const template = (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values });

const simpleTemplate = template`<div class="container"><h1>Hello</h1><p>World</p></div>`;

const complexTemplate = template`
  <div class="app" data-id="123">
    <header>
      <h1>Title</h1>
    </header>
    <main>
      <section>
        <p>Content here</p>
      </section>
    </main>
  </div>
`;

const nestedTemplate = template`
  <div>
    <span>
      <strong>
        <em>Nested text</em>
      </strong>
    </span>
  </div>
`;

const simpleExprTemplate = template`<div>${"expr"}</div>`;

const complexExprTemplate = template`
  <ul>
    ${"items"}.map(item => <li key=${"item.id"}>${"item.name"}</li>)
  </ul>
`;

describe("full pipeline - simple", () => {
  bench("tokenize + parse", () => {
    const tokens = tokenize(simpleTemplate.strings);
    parse(tokens);
  });

  bench("html-parse-string", () => {
    parse2(simpleTemplate.strings.join("$#$"));
  });
});

describe("full pipeline - complex", () => {
  bench("tokenize + parse", () => {
    const tokens = tokenize(complexTemplate.strings);
    parse(tokens);
  });

  bench("html-parse-string", () => {
    parse2(complexTemplate.strings.join("$#$"));
  });
});

describe("full pipeline - nested", () => {
  bench("tokenize + parse", () => {
    const tokens = tokenize(nestedTemplate.strings);
    parse(tokens);
  });

  bench("html-parse-string", () => {
    parse2(nestedTemplate.strings.join("$#$"));
  });
});

describe("full pipeline - simple expr", () => {
  bench("tokenize + parse", () => {
    const tokens = tokenize(simpleExprTemplate.strings);
    parse(tokens);
  });

  bench("html-parse-string", () => {
    parse2(simpleExprTemplate.strings.join("$#$"));
  });
});

describe("full pipeline - complex expr", () => {
  bench("tokenize + parse", () => {
    const tokens = tokenize(complexExprTemplate.strings);
    parse(tokens);
  });

  bench("html-parse-string", () => {
    parse2(complexExprTemplate.strings.join("$#$"));
  });
});
