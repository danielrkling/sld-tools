import * as ts from "typescript";
import { computeMappings, getJsxPosition, getTaggedPosition, MappingResult } from "./mappings";

export function toTagged(code: string): string {
  let result = code;
  let iterations = 0;
  const maxIterations = 100;

  while (iterations < maxIterations) {
    iterations++;

    const sourceFile = ts.createSourceFile(
      "test.tsx",
      result,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const jsxElement = findFirstJSXElement(sourceFile);

    if (!jsxElement) {
      break;
    }

    let inner = "";
    if (ts.isJsxElement(jsxElement)) {
      inner = convertJsxElementToString(jsxElement, sourceFile);
    } else if (ts.isJsxSelfClosingElement(jsxElement)) {
      inner = convertJsxSelfClosingToString(jsxElement, sourceFile);
    } else if (ts.isJsxFragment(jsxElement)) {
      inner = convertJsxFragmentToString(jsxElement, sourceFile);
    }

    const replacement = `jsx\`${inner}\``;

    result =
      result.slice(0, jsxElement.getStart()) +
      replacement +
      result.slice(jsxElement.getEnd());
  }

  return result;
}

export function toTaggedWithMappings(code: string): { code: string; mappings: MappingResult } {
  const codeResult = toTagged(code);
  const mappings = computeMappings(code, codeResult);
  return { code: codeResult, mappings };
}

function findFirstJSXElement(
  node: ts.Node,
): ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | undefined {
  if (
    ts.isJsxElement(node) ||
    ts.isJsxSelfClosingElement(node) ||
    ts.isJsxFragment(node)
  ) {
    return node;
  }

  if (ts.isJsxExpression(node)) {
    return undefined;
  }

  return ts.forEachChild(node, findFirstJSXElement);
}

function convertAttributes(
  attributes: ts.JsxAttributes,
  sourceFile: ts.SourceFile,
): string {
  let result = "";

  for (const attr of attributes.properties) {
    if (ts.isJsxAttribute(attr)) {
      const name = (attr.name as any).text || "";
      const value = attr.initializer;

      if (value) {
        const text = sourceFile.text.slice(value.getStart(), value.getEnd());
        if (ts.isJsxExpression(value)) {
          const exprText = text.slice(1, -1);
          result += ` ${name}=\${${exprText}}`;
        } else if (ts.isStringLiteral(value)) {
          result += ` ${name}="${value.text}"`;
        } else {
          result += ` \${${text}}`;
        }
      } else {
        result += ` ${name}`;
      }
    }
  }

  return result;
}

function convertJsxChildToTagged(
  child: ts.JsxChild,
  sourceFile: ts.SourceFile,
): string {
  if (ts.isJsxElement(child)) {
    return convertJsxElementToString(child, sourceFile);
  } else if (ts.isJsxSelfClosingElement(child)) {
    return convertJsxSelfClosingToString(child, sourceFile);
  } else if (ts.isJsxFragment(child)) {
    return convertJsxFragmentToString(child, sourceFile);
  } else if (ts.isJsxExpression(child)) {
    if (child.expression) {
      const text = sourceFile.text.slice(
        child.expression.getStart(),
        child.expression.getEnd(),
      );
      return "${" + text + "}";
    }
    return "";
  } else if (ts.isJsxText(child)) {
    return child.getText(sourceFile);
  }

  return "";
}

function convertJsxElementChildren(
  node: ts.JsxElement,
  sourceFile: ts.SourceFile,
): string {
  const children = node.children;
  if (children.length === 0) return "";

  let result = "";
  const text = sourceFile.text;

  const openingEnd = node.openingElement.getEnd();
  const firstChild = children[0];
  const firstStart = firstChild.getStart();
  if (firstStart > openingEnd) {
    result += text.slice(openingEnd, firstStart);
  }

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (i > 0) {
      const prevChild = children[i - 1];
      const prevEnd = prevChild.getEnd();
      const currStart = child.getStart();
      if (currStart > prevEnd) {
        result += text.slice(prevEnd, currStart);
      }
    }

    result += convertJsxChildToTagged(child, sourceFile);
  }

  return result;
}

function getTagNameText(tagName: any): string {
  if (ts.isIdentifier(tagName)) {
    return tagName.text;
  }
  return "";
}

function isComponent(tagName: any): boolean {
  if (ts.isIdentifier(tagName)) {
    const firstChar = tagName.text.charAt(0);
    return firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
  }
  return false;
}

function convertJsxElementToString(
  node: ts.JsxElement,
  sourceFile: ts.SourceFile,
): string {
  const tagName = getTagNameText(node.openingElement.tagName);
  const openTagName = isComponent(node.openingElement.tagName)
    ? "${" + tagName + "}"
    : tagName;
  const attributes = convertAttributes(
    node.openingElement.attributes,
    sourceFile,
  );

  const closeTagName = getTagNameText(node.closingElement.tagName);
  const closeTag = isComponent(node.closingElement.tagName)
    ? "${" + closeTagName + "}"
    : closeTagName;

  const children = convertJsxElementChildren(node, sourceFile);

  return `<${openTagName}${attributes}>${children}</${closeTag}>`;
}

function convertJsxSelfClosingToString(
  node: ts.JsxSelfClosingElement,
  sourceFile: ts.SourceFile,
): string {
  const tagName = getTagNameText(node.tagName);
  const tag = isComponent(node.tagName)
    ? "${" + tagName + "}"
    : tagName;
  const attributes = convertAttributes(node.attributes, sourceFile);

  return `<${tag}${attributes} />`;
}

function convertJsxFragmentToString(
  node: ts.JsxFragment,
  sourceFile: ts.SourceFile,
): string {
  const text = sourceFile.text;
  let children = "";

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];

    if (i > 0) {
      const prevChild = node.children[i - 1];
      const prevEnd = prevChild.getEnd();
      const currStart = child.getStart();
      if (currStart > prevEnd) {
        children += text.slice(prevEnd, currStart);
      }
    }

    children += convertJsxChildToTagged(child, sourceFile);
  }

  return `${children}`;
}

export { getJsxPosition, getTaggedPosition };
