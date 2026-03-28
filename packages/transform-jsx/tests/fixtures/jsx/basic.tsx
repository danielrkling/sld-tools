const name = "World";
const myClass = "active";
const handler = () => {};

function jsx(strings: TemplateStringsArray, ...exprs: any[]) {}

export const single = <div>Hello</div>;

export const multiple = <><div>Hello</div><span>World</span></>;

export const selfClosing = <img src="test.png" />;

export const nested = <div><span>Hello</span></div>;

export const withAttributes = <div class="foo" id="bar">Hello</div>;

export const withDynamicClass = <div class={myClass}>Hello</div>;

export const withEventHandler = <button onClick={handler}>Click</button>;

export const withRef = <div ref={myRef}>Hello</div>;

export const withPrimitiveString = <div class={"static"}>Hello</div>;

export const withPrimitiveNumber = <div data-count={42}>Hello</div>;

export const withPrimitiveBoolean = <div data-active={true}>Hello</div>;

export const withChildExpression = <div>{name}</div>;

export const withPrimitiveChild = <div>{"Hello"}</div>;

export const withPrimitiveNumberChild = <div>{42}</div>;
