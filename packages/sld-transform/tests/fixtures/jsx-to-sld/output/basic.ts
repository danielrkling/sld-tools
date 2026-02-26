const name = "World";
const myClass = "active";
const handler = () => {};
const myRef = (el) => {};

export const single = sld`<div>Hello</div>`;

export const multiple = sld`<div>Hello</div><span>World</span>`;

export const selfClosing = sld`<img src="test.png" />`;

export const nested = sld`<div><span>Hello</span></div>`;

export const withAttributes = sld`<div class="foo" id="bar">Hello</div>`;

export const withDynamicClass = sld`<div class=${() => myClass}>Hello</div>`;

export const withEventHandler = sld`<button onClick=${handler}>Click</button>`;

export const withRef = sld`<div ref=${myRef}>Hello</div>`;

export const withPrimitiveString = sld`<div class=${"static"}>Hello</div>`;

export const withPrimitiveNumber = sld`<div data-count=${42}>Hello</div>`;

export const withPrimitiveBoolean = sld`<div data-active=${true}>Hello</div>`;

export const withChildExpression = sld`<div>${() => name}</div>`;

export const withPrimitiveChild = sld`<div>${"Hello"}</div>`;

export const withPrimitiveNumberChild = sld`<div>${42}</div>`;
