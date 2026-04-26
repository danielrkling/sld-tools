function jsx(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
}

function Button<T>(props: { label: T; number: T; children?: any }) {
  return jsx`<button>${props.label}</button>`;
}

const wrongPropJSX = jsx`<${Button} label=${'A'} db="123" />`;

const nestedJSX = jsx`
  <div>
    <${A}>
      <${Button} label=${'A'} number=${1} />
      <${Button} label=${'B'} number=${2} />
    </${A}>
  </div>
`;
