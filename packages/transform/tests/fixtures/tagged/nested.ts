import { createSignal, Show } from "solid-js";

const [isVisible, setIsVisible] = createSignal(true);
function jsx(strings: TemplateStringsArray, ...exprs: any[]) {}

function Component(props: any) {
  return (
    jsx`<${Show} when=${isVisible()} fallback=${jsx`<p>Loading...</p>`}>
      <div>Hello World</div>
    </${Show}>`
  );
}

function AnotherComponent() {
  const [show, setShow] = createSignal(false);

  return (
    jsx`<div>
      <${Component} show=${show()}>
        <div>Modal Content</div>
      </${Component}>
      <${Component} onClick=${() => setShow(!show())}>
        ${() => (show() ? "Close" : "Open")}
      </${Component}>
    </div>`
  );
}