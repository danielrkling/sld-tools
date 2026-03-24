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
        .map((c) => renderJsxChild(c, sourceFile))
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
        .map((c) => renderJsxChild(c, sourceFile))
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
