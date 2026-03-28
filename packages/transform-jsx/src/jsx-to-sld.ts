import * as ts from "typescript";

interface Replacement {
  start: number;
  end: number;
  newText: string;
}

export function jsxToSld(text: string, options?: { tag?: string }): string {
  const tag = options?.tag ?? "jsx";

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
        .map((c) => renderJsxChild(c, sourceFile, tag))
        .join("");

      const sld = `${tag}\`<${tagName}${attrs}>${children}</${tagName}>\``;
      replacements.push({ start: nodeStart, end: nodeEnd, newText: sld });
      return;
    }

    if (ts.isJsxSelfClosingElement(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();

      const tagName = node.tagName.getText(sourceFile);
      const attrs = renderAttributes(node.attributes, sourceFile);
      const sld = `${tag}\`<${tagName}${attrs} />\``;

      replacements.push({ start: nodeStart, end: nodeEnd, newText: sld });
      return;
    }

    if (ts.isJsxFragment(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();

      const children = node.children
        .map((c) => renderJsxChild(c, sourceFile, tag))
        .join("");

      const sld = `${tag}\`${children}\``;
      replacements.push({ start: nodeStart, end: nodeEnd, newText: sld });
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return applyReplacements(text, replacements);
}

function renderAttributes(
  attrs: ts.JsxAttributes,
  sourceFile: ts.SourceFile
): string {
  const props = attrs.properties
    .map((prop) => {
      if (ts.isJsxAttribute(prop)) {
        const name = prop.name?.getText(sourceFile) ?? "";
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
  sourceFile: ts.SourceFile,
  tag: string
): string {
  if (ts.isJsxText(child)) return child.text;
  if (ts.isJsxExpression(child)) {
    const exprText = child.expression?.getText(sourceFile) ?? "";
    const convertedExpr = convertNestedJsx(exprText, sourceFile, tag);
    const wrappedExpr = shouldWrapExpression(null, convertedExpr)
      ? `() => ${convertedExpr}`
      : convertedExpr;
    return `\${${wrappedExpr}}`;
  }
  if (ts.isJsxElement(child)) {
    const tagName = child.openingElement.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.openingElement.attributes, sourceFile);
    const children = renderChildrenWithFormatting(child.children, sourceFile, tag);
    return `<${tagName}${attrs}>${children}</${tagName}>`;
  }
  if (ts.isJsxSelfClosingElement(child)) {
    const tagName = child.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.attributes, sourceFile);
    return `<${tagName}${attrs} />`;
  }
  return "";
}

function convertNestedJsx(exprText: string, sourceFile: ts.SourceFile, tag: string = "jsx"): string {
  const wrapped = `<wrapper>${exprText}</wrapper>`;
  const tempFile = ts.createSourceFile("temp.tsx", wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  
  const replacements: Replacement[] = [];
  
  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tempFile) === "wrapper") {
      ts.forEachChild(node, visit);
      return;
    }
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      const nestedResult = convertJsxNodeToSld(node, tempFile, tag);
      const nestedTemplate = `${tag}\`${nestedResult}\``;
      const nodeStart = node.getStart(tempFile);
      const nodeEnd = node.getEnd();
      replacements.push({ start: nodeStart, end: nodeEnd, newText: nestedTemplate });
      return;
    }
    ts.forEachChild(node, visit);
  }
  
  visit(tempFile);
  
  if (replacements.length === 0) return exprText;
  
  replacements.sort((a, b) => b.start - a.start);
  let result = wrapped;
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.newText + result.slice(r.end);
  }
  
  return result.slice("<wrapper>".length, -"</wrapper>".length);
}

function convertJsxNodeToSld(node: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment, sourceFile: ts.SourceFile, tag: string): string {
  if (ts.isJsxElement(node)) {
    const tagName = node.openingElement.tagName.getText(sourceFile);
    const attrs = renderAttributes(node.openingElement.attributes, sourceFile);
    const children = renderChildrenWithFormatting(node.children, sourceFile, tag);
    return `<${tagName}${attrs}>${children}</${tagName}>`;
  }
  if (ts.isJsxSelfClosingElement(node)) {
    const tagName = node.tagName.getText(sourceFile);
    const attrs = renderAttributes(node.attributes, sourceFile);
    return `<${tagName}${attrs} />`;
  }
  if (ts.isJsxFragment(node)) {
    const children = renderChildrenWithFormatting(node.children, sourceFile, tag);
    return children;
  }
  return "";
}

function renderChildrenWithFormatting(
  children: ts.NodeArray<ts.JsxChild>,
  sourceFile: ts.SourceFile,
  tag: string
): string {
  if (children.length === 0) return "";
  
  const results: string[] = [];
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childText = renderJsxChild(child, sourceFile, tag);
    
    if (i === 0) {
      results.push(childText);
    } else {
      const prevChild = children[i - 1];
      const prevEnd = prevChild.getEnd();
      const currStart = child.getStart(sourceFile);
      const betweenText = sourceFile.text.slice(prevEnd, currStart);
      
      const isWhitespaceOnly = ts.isJsxText(child) && child.text.trim() === "";
      
      if (isWhitespaceOnly) {
        results.push(betweenText);
      } else {
        results.push(betweenText + childText);
      }
    }
  }
  
  return results.join("");
}

function isPrimitiveExpression(exprText: string): boolean {
  const trimmed = exprText.trim();
  if (trimmed === "") return true;

  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false);
  scanner.setText(trimmed);
  const token = scanner.scan();

  if (
    token === ts.SyntaxKind.StringLiteral ||
    token === ts.SyntaxKind.NumericLiteral ||
    token === ts.SyntaxKind.TrueKeyword ||
    token === ts.SyntaxKind.FalseKeyword ||
    token === ts.SyntaxKind.NullKeyword
  ) {
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

function applyReplacements(text: string, replacements: Replacement[]): string {
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
