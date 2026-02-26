import * as ts from "typescript";
import {
  parse,
  tokenize,
  RootNode,
  ElementNode,
  TextNode,
  ExpressionNode,
  ChildNode,
  PropNode,
  rawTextElements,
  voidElements,
  TEXT_NODE,
  ELEMENT_NODE,
  EXPRESSION_NODE,
  BOOLEAN_PROP,
  STATIC_PROP,
  EXPRESSION_PROP,
  MIXED_PROP,
} from "sld-parse";

interface Replacement {
  start: number;
  end: number;
  newText: string;
}

export function sldToJsx(text: string): string {
  const sourceFile = ts.createSourceFile(
    "test.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const replacements: Replacement[] = [];

  function visit(node: ts.Node): void {
    if (ts.isTaggedTemplateExpression(node)) {
      const tagName = node.tag.getText(sourceFile);
      if (/^sld$/i.test(tagName)) {
        const jsx = transformSldTemplate(node.template, sourceFile);
        replacements.push({
          start: node.getStart(sourceFile),
          end: node.getEnd(),
          newText: jsx,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  replacements.sort((a, b) => b.start - a.start);

  let result = text;
  for (const replacement of replacements) {
    result =
      result.slice(0, replacement.start) +
      replacement.newText +
      result.slice(replacement.end);
  }

  return result;
}

function transformSldTemplate(
  template: ts.TemplateLiteral,
  sourceFile: ts.SourceFile
): string {
  const { strings, expressions } = extractTemplateData(template, sourceFile);
  const tokens = tokenize(strings, rawTextElements);
  const ast = parse(tokens, voidElements);
  return renderAstToJsx(ast, expressions);
}

function extractTemplateData(
  template: ts.TemplateLiteral,
  sourceFile: ts.SourceFile
): { strings: string[]; expressions: string[] } {
  const strings: string[] = [];
  const expressions: string[] = [];

  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    strings.push(template.text);
  } else {
    strings.push(template.head.text);
    for (const span of template.templateSpans) {
      expressions.push(span.expression.getText(sourceFile));
      strings.push(span.literal.text);
    }
  }

  return { strings, expressions };
}

function renderAstToJsx(ast: RootNode, expressions: string[]): string {
  const parts = ast.children.map((child) => renderChild(child, expressions));
  const jsx = parts.join("");

  const rootElements = countRootElements(ast);
  return rootElements > 1 ? `<>${jsx}</>` : jsx;
}

function renderChild(node: ChildNode, expressions: string[]): string {
  if (node.type === TEXT_NODE) {
    return (node as TextNode).value;
  }
  
  if (node.type === EXPRESSION_NODE) {
    const exprNode = node as ExpressionNode;
    const expr = unwrapArrowExpression(expressions[exprNode.value]);
    return `{${expr}}`;
  }
  
  if (node.type === ELEMENT_NODE) {
    return renderElement(node as ElementNode, expressions);
  }
  
  return "";
}

function renderElement(node: ElementNode, expressions: string[]): string {
  const tagName = node.name;
  const props = node.props.map((p) => renderProp(p, expressions)).join("");
  const children = node.children
    .map((c) => renderChild(c, expressions))
    .join("");

  if (node.slash || voidElements.has(tagName)) {
    return `<${tagName}${props} />`;
  }

  return `<${tagName}${props}>${children}</${tagName}>`;
}

function renderProp(prop: PropNode, expressions: string[]): string {
  if (prop.type === BOOLEAN_PROP) {
    return ` ${prop.name}`;
  }
  
  if (prop.type === STATIC_PROP) {
    return ` ${prop.name}="${prop.value}"`;
  }
  
  if (prop.type === EXPRESSION_PROP) {
    const expr = unwrapArrowExpression(expressions[prop.value]);
    if (prop.name === "...") {
      return ` {...${expr}}`;
    }
    return ` ${prop.name}={${expr}}`;
  }
  
  if (prop.type === MIXED_PROP) {
    const parts = prop.value.map((v) =>
      typeof v === "number" ? `\${${unwrapArrowExpression(expressions[v])}}` : v
    );
    return ` ${prop.name}={\`${parts.join("")}\`}`;
  }
  
  return "";
}

function countRootElements(ast: RootNode): number {
  return ast.children.filter((c) => c.type === ELEMENT_NODE).length;
}

function isPrimitiveExpression(exprText: string): boolean {
  const trimmed = exprText.trim();
  if (trimmed === "") return true;
  
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false);
  scanner.setText(trimmed);
  const token = scanner.scan();
  
  if (token === ts.SyntaxKind.StringLiteral ||
      token === ts.SyntaxKind.NumericLiteral ||
      token === ts.SyntaxKind.TrueKeyword ||
      token === ts.SyntaxKind.FalseKeyword ||
      token === ts.SyntaxKind.NullKeyword) {
    scanner.scan();
    return scanner.getToken() === ts.SyntaxKind.EndOfFileToken;
  }
  
  if (token === ts.SyntaxKind.Identifier && trimmed === "undefined") {
    scanner.scan();
    return scanner.getToken() === ts.SyntaxKind.EndOfFileToken;
  }
  
  if (token === ts.SyntaxKind.FirstTemplateToken) {
    scanner.scan();
    return scanner.getToken() === ts.SyntaxKind.EndOfFileToken;
  }
  
  return false;
}

function shouldWrapExpression(propName: string | null, exprText: string): boolean {
  if (propName === "ref") return false;
  if (propName !== null && propName.startsWith("on")) return false;
  if (isPrimitiveExpression(exprText)) return false;
  return true;
}

function unwrapArrowExpression(exprText: string): string {
  const trimmed = exprText.trim();
  const arrowMatch = trimmed.match(/^\(\s*\)\s*=>\s*(.+)$/s);
  if (arrowMatch) {
    return arrowMatch[1].trim();
  }
  return exprText;
}

export function jsxToSld(text: string): string {
  const sourceFile = ts.createSourceFile(
    "test.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const replacements: Replacement[] = [];

  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();

      const tagName = node.openingElement.tagName.getText(sourceFile);
      const attrs = renderAttributes(node.openingElement.attributes, sourceFile);
      const children = node.children
        .map((c) => renderJsxChild(c, sourceFile))
        .join("");

      const sld = `sld\`<${tagName}${attrs}>${children}</${tagName}>\``;
      replacements.push({ start: nodeStart, end: nodeEnd, newText: sld });
      return;
    } 
    
    if (ts.isJsxSelfClosingElement(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();

      const tagName = node.tagName.getText(sourceFile);
      const attrs = renderAttributes(node.attributes, sourceFile);
      const sld = `sld\`<${tagName}${attrs} />\``;

      replacements.push({ start: nodeStart, end: nodeEnd, newText: sld });
      return;
    } 
    
    if (ts.isJsxFragment(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();
      
      const children = node.children
        .map((c) => renderJsxChild(c, sourceFile))
        .join("");
      
      const sld = `sld\`${children}\``;
      replacements.push({ start: nodeStart, end: nodeEnd, newText: sld });
      return;
    }
    
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  replacements.sort((a, b) => b.start - a.start);

  let result = text;
  for (const replacement of replacements) {
    result =
      result.slice(0, replacement.start) +
      replacement.newText +
      result.slice(replacement.end);
  }

  return result;
}

function renderAttributes(
  attrs: ts.JsxAttributes,
  sourceFile: ts.SourceFile
): string {
  const props = attrs.properties
    .map((prop) => {
      if (ts.isJsxAttribute(prop)) {
        const name = prop.name.getText(sourceFile);
        if (prop.initializer) {
          if (ts.isJsxExpression(prop.initializer)) {
            const exprText = prop.initializer.expression?.getText(sourceFile) ?? "";
            const wrappedExpr = shouldWrapExpression(name, exprText) 
              ? `() => ${exprText}` 
              : exprText;
            return ` ${name}=\${${wrappedExpr}}`;
          }
          const value = prop.initializer.getText(sourceFile);
          return ` ${name}=${value}`;
        }
        return ` ${name}`;
      }
      if (ts.isJsxSpreadAttribute(prop)) {
        return ` ...\${${prop.expression.getText(sourceFile)}}`;
      }
      return "";
    })
    .join("");
  return props;
}

function renderJsxChild(
  child: ts.JsxChild,
  sourceFile: ts.SourceFile
): string {
  if (ts.isJsxText(child)) return child.text;
  if (ts.isJsxExpression(child)) {
    const exprText = child.expression?.getText(sourceFile) ?? "";
    const wrappedExpr = shouldWrapExpression(null, exprText) 
      ? `() => ${exprText}` 
      : exprText;
    return `\${${wrappedExpr}}`;
  }
  if (ts.isJsxElement(child)) {
    const tagName = child.openingElement.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.openingElement.attributes, sourceFile);
    const children = child.children
      .map((c) => renderJsxChild(c, sourceFile))
      .join("");
    return `<${tagName}${attrs}>${children}</${tagName}>`;
  }
  if (ts.isJsxSelfClosingElement(child)) {
    const tagName = child.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.attributes, sourceFile);
    return `<${tagName}${attrs} />`;
  }
  return "";
}
