const name = "World";
const myClass = "active";
const handler = () => {};

export const single = sld`<div>Hello</div>`;

export const multiple = sld`<div>Hello</div><span>World</span>`;

export const withExpression = sld`<div>${name}</div>`;

export const selfClosing = sld`<img src="test.png" />`;

export const nested = sld`<div><span>Hello</span></div>`;

export const withAttributes = sld`<div class="foo" id="bar">Hello</div>`;

export const mixed = sld`<div></div>${expr}<span></span>`;

export const empty = sld`<div></div>`;

export const withBoolean = sld`<input disabled />`;

export const withDynamicAttr = sld`<div class=${myClass} />`;

export const withArrowExpression = sld`<div class=${() => myClass}>Hello</div>`;

export const withArrowChild = sld`<div>${() => name}</div>`;

export const withEventHandler = sld`<button onClick=${handler}>Click</button>`;
