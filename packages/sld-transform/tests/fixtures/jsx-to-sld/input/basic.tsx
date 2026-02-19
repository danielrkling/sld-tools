const name = "World";

export const single = <div>Hello</div>;

export const multiple = <><div>Hello</div><span>World</span></>;

export const selfClosing = <img src="test.png" />;

export const nested = <div><span>Hello</span></div>;

export const withAttributes = <div class="foo" id="bar">Hello</div>;
