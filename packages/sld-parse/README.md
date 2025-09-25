# sld-parse

Home of possible custom parser. 

sld is currently using html5parser. This was chosen because it's small, fast, not reg-exp based and maintains casing on tag names and attribues.

To get it to work with tagged templates, you have to join all the strings with a marker and then parse through the ast to find all the markers and reinterpret.

The goal will be to make a parser that is built for tagged tempaltes. Meaning its signtrue is 
```ts
function parse(
  templates: TemplateStringsArray,
  ...values: any[]
): RootNode
```
where root node is an AST specifically designed for sld templating, but I imagine would be broadly useful. 

This parser could also be used in sld-tools to aid in type checking, quickinfo and other ts tools and formatting.
