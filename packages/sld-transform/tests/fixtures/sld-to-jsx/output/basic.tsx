const name = "World";
const myClass = "active";
const handler = () => {};

export const single = <div>Hello</div>;

export const multiple = <><div>Hello</div><span>World</span></>;

export const withExpression = <div>{name}</div>;

export const selfClosing = <img src="test.png" />;

export const nested = <div><span>Hello</span></div>;

export const withAttributes = <div class="foo" id="bar">Hello</div>;

export const mixed = <><div></div>{expr}<span></span></>;

export const empty = <div></div>;

export const withBoolean = <input disabled />;

export const withDynamicAttr = <div class={myClass} />;

export const withArrowExpression = <div class={myClass}>Hello</div>;

export const withArrowChild = <div>{name}</div>;

export const withEventHandler = <button onClick={handler}>Click</button>;
