import * as ts from "typescript";

function findSldTemplates(text: string): { start: number; end: number }[] {
  const matches: { start: number; end: number }[] = [];
  const regex = /sld`[^`]*`/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length });
  }
  return matches;
}

function sldToJsx(sourceFile: ts.SourceFile, range: { start: number; end: number }): string {
  console.log(`  sldToJsx called with range ${range.start}-${range.end}`);
  function visit(node: ts.Node): string {
    if (ts.isTaggedTemplateExpression(node)) {
      const tagName = node.tag.getText(sourceFile);
      if (/^sld$/i.test(tagName)) {
        const nodeStart = node.getStart(sourceFile);
        const nodeEnd = node.getEnd();
        
        if (nodeStart >= range.start && nodeEnd <= range.end) {
          const template = node.template;
          if (ts.isNoSubstitutionTemplateLiteral(template)) {
            const text = template.text;
            const topLevelElements = countTopLevelElements(text);
            if (topLevelElements > 1) {
              return `<>${text}</>`;
            }
            return text;
          } else if (ts.isTemplateExpression(template)) {
            console.log(`  Template is a TemplateExpression`);
            let result = template.head.text;
            for (const span of template.templateSpans) {
              const exprText = span.expression.getText(sourceFile);
              result += `{${exprText}}${span.literal.text}`;
            }
            
            const topLevelElements = countTopLevelElements(result);
            console.log(`  Top level elements: ${topLevelElements}`);
            if (topLevelElements > 1) {
              return `<>${result}</>`;
            }
            return result;
          }
        }
      }
    }
    let result = "";
    ts.forEachChild(node, (child) => {
      const childResult = visit(child);
      if (childResult) result = childResult;
    });
    return result;
  }
  return visit(sourceFile);
}

function countTopLevelElements(text: string): number {
  let count = 0;
  let depth = 0;
  let inTag = false;
  let tagName = "";
  let isClosing = false;
  
  console.log(`  Counting elements in: "${text}"`);
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (!inTag && char === "<") {
      isClosing = text[i + 1] === "/";
      inTag = true;
      tagName = "";
      console.log(`    Found < at ${i}, isClosing=${isClosing}`);
      continue;
    }
    
    if (inTag) {
      if (char === ">") {
        console.log(`    Found > at ${i}, tagName="${tagName}", depth before=${depth}`);
        if (isClosing) {
          depth--;
        } else if (!tagName.endsWith("/")) {
          depth++;
        }
        console.log(`    depth after=${depth}, isClosing=${isClosing}`);
        inTag = false;
        if (depth === 1 && isClosing) {
          count++;
          console.log(`    count++ (closing at depth 1), count=${count}`);
        } else if (depth === 1 && !isClosing && !tagName.endsWith("/")) {
          count++;
          console.log(`    count++ (opening at depth 1), count=${count}`);
        }
        continue;
      }
      
      if (tagName === "" && /[a-zA-Z]/.test(char)) {
        tagName = char;
      } else if (tagName && /[a-zA-Z0-9\-]/.test(char)) {
        tagName += char;
      }
      continue;
    }
  }
  
  console.log(`  Final count: ${count}`);
  return count;
}

const testCases = [
  { name: "single element", input: 'sld`<div>Hello</div>`' },
  { name: "multiple elements", input: 'sld`<div>Hello</div><span>World</span>`' },
  { name: "with expression", input: 'sld`<div>{name}</div>`' },
  { name: "self closing", input: 'sld`<img src="test.png" />`' },
  { name: "nested", input: 'sld`<div><span>Hello</span></div>`' },
  { name: "with attributes", input: 'sld`<div class="foo" id="bar">Hello</div>`' },
  { name: "three elements", input: 'sld`<div></div><span></span><p></p>`' },
  { name: "mixed", input: 'sld`<div></div>{expr}<span></span>`' },
];

console.log("=== SLD to JSX Tests ===\n");

for (const test of testCases) {
  console.log(`Test: ${test.name}`);
  console.log(`Input:  ${test.input}`);
  
  const sourceFile = ts.createSourceFile(
    "test.ts",
    test.input,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  
  const matches = findSldTemplates(test.input);
  if (matches.length > 0) {
    const result = sldToJsx(sourceFile, matches[0]);
    console.log(`  Debug: result = "${result}"`);
    console.log(`Output: ${result}`);
  } else {
    console.log("Output: (no SLD template found)");
  }
  console.log("");
}