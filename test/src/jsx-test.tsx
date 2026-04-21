function jsx(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

function Button<T>(props: { label: T, number: T, children?: any }) {
  return jsx`<button>${props.label}</button>`;
}


const wrongPropJSX = jsx`<${Button} label=${"A"} number=${1} />`;
//These errors should also show below in the template string

const correctPropJSX = jsx`<${Button} label=${"A"} number=${"1"} />`

