const name = "World";

export const single = sld`<div>Hello</div>`;

export const multiple = sld`<div>Hello</div><span>World</span>`;

export const selfClosing = sld`<img src="test.png" />`;

export const nested = sld`<div><span>Hello</span></div>`;

export const withAttributes = sld`<div class="foo" id="bar">Hello</div>`;
