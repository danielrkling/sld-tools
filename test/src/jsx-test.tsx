function jsx(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

function Button(props: { label: string, number?: number }) {
  return <button>{props.label}</button>;
}


const wrongPropJSX = <Button number={"fa"} label={13} />;
//These errors should also show below in the template string

const wrongPropTJSX = jsx`<Button number=${"fa"} label=${13} />`;