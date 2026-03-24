import { sld } from "solid-html";
import { Badge } from "@kobalte/core/badge";
import { Show, For, createSignal } from "solid-js";

function html(strings: TemplateStringsArray, ...values: any[]) {
  return sld(strings, ...values);
}

  const [items, setItems] = createSignal(["Solid", "Signals", "Reactivity"]);
  const [isVisible, setIsVisible] = createSignal(true);

function JSX() {
  return (
    <div>
      <button onClick={() => setIsVisible(!isVisible())}>Toggle List</button>

      <Show when={isVisible()} fallback={<p>The list is hidden.</p>}>
        <ul>
          <For each={items()}>{(item) => <li>{item}</li>}</For>
        </ul>
      </Show>
    </div>
  );
}

function SLD() {
  return (
    sld`<div>
      <button onClick=${() => setIsVisible(!isVisible())}>Toggle List</button>

      <${Show} when=${isVisible()} fallback=${sld`<p>The list is hidden.</p>`}>
        <ul>
          <${For} each=${items()}>${(item) => sld`<li>${item}</li>`}<//>
        </ul>
      </${Show}>

      <Show when=${isVisible()} fallback=${sld`<p>The list is hidden.</p>`}>
        <ul>
          <For each=${items()}>${(item) => sld`<li>${item}</li>`}</For>
        </ul>
      </Show>
    </div>`
  );
}

function HTM() {
  return (
    html`<div>
      <button onClick=${() => setIsVisible(!isVisible())}>Toggle List</button>

      <${Show} when=${isVisible()} fallback=${sld`<p>The list is hidden.</p>`}>
        <ul>
          <${For} each=${items()}>${(item) => html`<li>${item}</li>`}</${For}>
        </ul>
      </${Show}>
    </div>`
  );
}

