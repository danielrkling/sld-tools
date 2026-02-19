import * as ts from "typescript";

export function sldToJsx(text: string): string {
  const sourceFile = ts.createSourceFile(
    "test.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  interface Replacement {
    start: number;
    end: number;
    newText: string;
  }

  const replacements: Replacement[] = [];

  function visit(node: ts.Node): void {
    if (ts.isTaggedTemplateExpression(node)) {
      const tagName = node.tag.getText(sourceFile);
      if (/^sld$/i.test(tagName)) {
        const nodeStart = node.getStart(sourceFile);
        const nodeEnd = node.getEnd();
        
        const template = node.template;
        let jsx = "";
        
        if (ts.isNoSubstitutionTemplateLiteral(template)) {
          jsx = template.text;
        } else if (ts.isTemplateExpression(template)) {
          jsx = template.head.text;
          for (const span of template.templateSpans) {
            const exprText = span.expression.getText(sourceFile);
            jsx += `{${exprText}}${span.literal.text}`;
          }
        }
        
        const topLevelElements = countTopLevelElements(jsx);
        if (topLevelElements > 1) {
          jsx = `<>${jsx}</>`;
        }
        
        replacements.push({ start: nodeStart, end: nodeEnd, newText: jsx });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Sort by position descending so replacements don't interfere with each other
  replacements.sort((a, b) => b.start - a.start);

  let result = text;
  for (const replacement of replacements) {
    result = result.slice(0, replacement.start) + replacement.newText + result.slice(replacement.end);
  }

  return result;
}

export function jsxToSld(text: string): string {
  const sourceFile = ts.createSourceFile(
    "test.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  interface Replacement {
    start: number;
    end: number;
    newText: string;
  }

  const replacements: Replacement[] = [];

  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();
      
      const tagName = node.openingElement.tagName.getText(sourceFile);
      const attrs = renderAttributes(node.openingElement.attributes, sourceFile);
      const children = node.children.map(c => renderJsxChild(c, sourceFile)).join("");
      const isSelfClosing = node.closingElement === undefined;
      
      let sld = "";
      if (isSelfClosing) {
        sld = `sld\`<${tagName}${attrs} />\``;
      } else {
        sld = `sld\`<${tagName}${attrs}>${children}</${tagName}>\``;
      }
      
      replacements.push({ start: nodeStart, end: nodeEnd, newText: sld });
    } else if (ts.isJsxSelfClosingElement(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();
      
      const tagName = node.tagName.getText(sourceFile);
      const attrs = renderAttributes(node.attributes, sourceFile);
      const sld = `sld\`<${tagName}${attrs} />\``;
      
      replacements.push({ start: nodeStart, end: nodeEnd, newText: sld });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Sort by position descending so replacements don't interfere with each other
  replacements.sort((a, b) => b.start - a.start);

  let result = text;
  for (const replacement of replacements) {
    result = result.slice(0, replacement.start) + replacement.newText + result.slice(replacement.end);
  }

  return result;
}

function countTopLevelElements(text: string): number {
  let count = 0;
  let depth = 0;
  let inTag = false;
  let tagName = "";
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (!inTag && char === "<" && text[i + 1] !== "/") {
      inTag = true;
      tagName = "";
      continue;
    }
    
    if (inTag && char === ">") {
      if (!tagName.endsWith("/")) {
        depth++;
        if (depth === 1) {
          count++;
        }
      }
      inTag = false;
      continue;
    }
    
    if (inTag && char === "/" && text[i + 1] === ">") {
      depth--;
      inTag = false;
      continue;
    }
    
    if (inTag && tagName === "" && /[a-zA-Z]/.test(char)) {
      tagName = char;
    } else if (inTag && /[a-zA-Z0-9\-]/.test(char)) {
      tagName += char;
    }
  }
  
  return count;
}

function renderAttributes(attrs: ts.JsxAttributes, sourceFile: ts.SourceFile): string {
  const props = attrs.properties.map(prop => {
    if (ts.isJsxAttribute(prop)) {
      const name = prop.name.getText(sourceFile);
      if (prop.initializer) {
        if (ts.isJsxExpression(prop.initializer)) {
          return ` ${name}={${prop.initializer.expression?.getText(sourceFile) ?? ""}}`;
        }
        return ` ${name}="${prop.initializer.getText(sourceFile)}"`;
      }
      return ` ${name}`;
    }
    if (ts.isJsxSpreadAttribute(prop)) {
      return ` {...${prop.expression.getText(sourceFile)}}`;
    }
    return "";
  }).join("");
  return props;
}

function renderJsxChild(child: ts.JsxChild, sourceFile: ts.SourceFile): string {
  if (ts.isJsxText(child)) return child.getText(sourceFile);
  if (ts.isJsxExpression(child)) return `{${child.expression?.getText(sourceFile) ?? ""}}`;
  if (ts.isJsxElement(child)) {
    const tagName = child.openingElement.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.openingElement.attributes, sourceFile);
    const children = child.children.map(c => renderJsxChild(c, sourceFile)).join("");
    return `<${tagName}${attrs}>${children}</${tagName}>`;
  }
  if (ts.isJsxSelfClosingElement(child)) {
    const tagName = child.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.attributes, sourceFile);
    return `<${tagName}${attrs} />`;
  }
  return "";
}
