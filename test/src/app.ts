function jsx(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}



const wrongPropTX = jsx`<Button   number=${13}>Hello</Button><div class=${12}/>`;

