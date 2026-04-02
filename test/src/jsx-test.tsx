function jsx(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

const greeting = "World";
const el = jsx`<div class="foo">Hello ${greeting}<div>`;

const el2 = jsx`<div>test</div>`;

const el3 = jsx`<span class="bar">content</span>`;
