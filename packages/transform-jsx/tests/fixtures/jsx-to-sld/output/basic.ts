const name = "World";
const myClass = "active";
const handler = () => {};
const myRef = (el) => {};

export const single = jsx`<div>Hello</div>`;

export const multiple = jsx`<div>Hello</div><span>World</span>`;

export const selfClosing = jsx`<img src="test.png" />`;

export const nested = jsx`<div><span>Hello</span></div>`;

export const withAttributes = jsx`<div class="foo" id="bar">Hello</div>`;

export const withDynamicClass = jsx`<div class=${() => myClass}>Hello</div>`;

export const withEventHandler = jsx`<button onClick=${handler}>Click</button>`;

export const withRef = jsx`<div ref=${myRef}>Hello</div>`;

export const withPrimitiveString = jsx`<div class=${"static"}>Hello</div>`;

export const withPrimitiveNumber = jsx`<div data-count=${42}>Hello</div>`;

export const withPrimitiveBoolean = jsx`<div data-active=${true}>Hello</div>`;

export const withChildExpression = jsx`<div>${() => name}</div>`;

export const withPrimitiveChild = jsx`<div>${"Hello"}</div>`;

export const withPrimitiveNumberChild = jsx`<div>${42}</div>`;
