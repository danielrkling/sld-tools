function jsx(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

function Button(props: { label: "A"| "B", number?: number }) {
  return <button>{props.label}</button>;
}


const wrongPropJSX = <Button  />;
//These errors should also show below in the template string



const wrongPropTJSX = jsx`<Button  number=${"13"}>Hello</Button><div class=${12}/>`;