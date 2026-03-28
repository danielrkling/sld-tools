import { sld } from "solid-html";
import { Badge } from "@kobalte/core/badge";
import { Show, For, createSignal } from "solid-js";

function html(strings: TemplateStringsArray, ...values: any[]) {
  return sld(strings, ...values);
}

const [items, setItems] = createSignal(["Solid", "Signals", "Reactivity"]);
const [isVisible, setIsVisible] = createSignal(true);

function JSX(props: { class?: string }) {
  return (
    jsx`
      <h1 class=${() => props.class}>Hello, Solid!</h1>
      <div>
        <button ...${props} onClick=${() => setIsVisible(!isVisible())}>
          Toggle List
        </button>

        <Show when=${() => isVisible()} fallback=${() => <p>The list is hidden.</p>}>
          <ul>
            <For each=${() => items()}>${() => (item) => jsx`<li>${() => item}</li>`}</For>
          </ul>
        </Show>
      </div>
    `
  );
}


function SLD() {
  return jsx`
      <Show when=${isVisible()} fallback=${<p>The list is hidden.</p>}>
        Hello World
      </Show>
    `;
}   
