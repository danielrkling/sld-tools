const name = "World";
const myClass = "active";
const handler = () => {};

export const single = jsx`<div>Hello</div>`;

export const multiple = jsx`<div>Hello</div><span>World</span>`;

export const withExpression = jsx`<div>${name}</div>`;

export const selfClosing = jsx`<img src="test.png" />`;

export const nested = jsx`<div><span>Hello</span></div>`;

export const withAttributes = jsx`<div class="foo" id="bar">Hello</div>`;

export const mixed = jsx`<div></div>${expr}<span></span>`;

export const empty = jsx`<div></div>`;

export const withBoolean = jsx`<input disabled />`;

export const withDynamicAttr = jsx`<div class=${myClass} />`;

export const withArrowExpression = jsx`<div class=${() => myClass}>Hello</div>`;

export const withArrowChild = jsx`<div>${() => name}</div>`;

export const withEventHandler = jsx`<button onClick=${handler}>Click</button>`;
