function jsx(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

function Button<T>(props: { label: T, number: T, children: any }) {
  return <button>{props.label}</button>;
}


const wrongPropJSX = <Button label={"A"} number={1} />;
//These errors should also show below in the template string

