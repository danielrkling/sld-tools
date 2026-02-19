import * as ts from "typescript/lib/tsserverlibrary";
import {
  parseSLDTemplate,
  getSLDTemplatesNodes,
  RootNode,
  ChildNode,
  Property,
  TEXT_NODE,
  INSERT_NODE,
  ELEMENT_NODE,
  COMPONENT_NODE,
  COMMENT_NODE,
  BOOLEAN_PROPERTY,
  STRING_PROPERTY,
  DYNAMIC_PROPERTY,
  MIXED_PROPERTY,
  SPREAD_PROPERTY,
  ANONYMOUS_PROPERTY,
} from "./parse";

export function sldToJsx(
  ts: typeof import("typescript"),
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  node: ts.TaggedTemplateExpression
): string {
  const root = parseSLDTemplate(ts, checker, sourceFile, node);
  return renderRootToJsx(root, ts, sourceFile);
}

export function jsxToSld(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): string {
  const jsxElements = findJsxElements(ts, sourceFile);
  const jsxSelfClosing = findJsxSelfClosingElements(ts, sourceFile);
  return [...jsxElements, ...jsxSelfClosing]
    .map((node) => renderJsxToSld(ts, sourceFile, node))
    .join("\n");
}

function findJsxElements(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): ts.JsxElement[] {
  const elements: ts.JsxElement[] = [];
  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isJsxElement(node)) {
      elements.push(node);
    }
    ts.forEachChild(node, visit);
  });
  return elements;
}

function findJsxSelfClosingElements(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): ts.JsxSelfClosingElement[] {
  const elements: ts.JsxSelfClosingElement[] = [];
  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isJsxSelfClosingElement(node)) {
      elements.push(node);
    }
    ts.forEachChild(node, visit);
  });
  return elements;
}

function getJsxTagName(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  node: ts.JsxElement | ts.JsxSelfClosingElement
): string {
  if (ts.isJsxElement(node)) {
    return node.openingElement.tagName.getText(sourceFile);
  }
  const selfClosing = node as ts.JsxSelfClosingElement;
  return (selfClosing.tagName as ts.Identifier).getText(sourceFile);
}

function getJsxAttributes(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  node: ts.JsxElement | ts.JsxSelfClosingElement
): string {
  if (ts.isJsxElement(node)) {
    return renderJsxAttributes(ts, sourceFile, node.openingElement.attributes);
  }
  const selfClosing = node as ts.JsxSelfClosingElement;
  return renderJsxAttributes(ts, sourceFile, selfClosing.attributes);
}

function renderJsxToSld(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  node: ts.JsxElement | ts.JsxSelfClosingElement
): string {
  const tagName = getJsxTagName(ts, sourceFile, node);
  const attributes = getJsxAttributes(ts, sourceFile, node);

  if (ts.isJsxSelfClosingElement(node)) {
    return `sld\`<${tagName}${attributes} />\``;
  }

  const children = node.children
    .map((child) => renderJsxChild(ts, sourceFile, child))
    .join("");

  return `sld\`<${tagName}${attributes}>${children}</${tagName}>\``;
}

function renderJsxAttributes(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  attributes: ts.JsxAttributes
): string {
  const props = attributes.properties.map((prop) => {
    if (ts.isJsxAttribute(prop)) {
      const name = prop.name?.getText(sourceFile) ?? "";
      if (prop.initializer) {
        if (ts.isJsxExpression(prop.initializer)) {
          if (prop.initializer.expression) {
            const expr = prop.initializer.expression.getText(sourceFile);
            return ` ${name}={${expr}}`;
          }
          return ` ${name}={}`;
        }
        return ` ${name}="${prop.initializer.getText(sourceFile)}"`;
      }
      return ` ${name}`;
    }
    if (ts.isJsxSpreadAttribute(prop)) {
      const expr = prop.expression.getText(sourceFile);
      return ` {...${expr}}`;
    }
    return "";
  });
  return props.join("");
}

function renderJsxChild(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  child: ts.JsxChild
): string {
  if (ts.isJsxText(child)) {
    return child.getText(sourceFile);
  }
  if (ts.isJsxExpression(child)) {
    if (child.expression) {
      return `{${child.expression.getText(sourceFile)}}`;
    }
    return "";
  }
  if (ts.isJsxElement(child)) {
    return renderJsxToSld(ts, sourceFile, child);
  }
  if (ts.isJsxSelfClosingElement(child)) {
    const selfClosing = child as ts.JsxSelfClosingElement;
    const tagName = selfClosing.tagName.getText(sourceFile);
    const attributes = renderJsxAttributes(ts, sourceFile, selfClosing.attributes);
    return `<${tagName}${attributes} />`;
  }
  if (ts.isJsxFragment(child)) {
    return child.children
      .map((c) => renderJsxChild(ts, sourceFile, c))
      .join("");
  }
  return "";
}

function renderRootToJsx(
  root: RootNode,
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): string {
  return root.children.map((child) => renderNodeToJsx(child, ts, sourceFile)).join("");
}

function renderNodeToJsx(
  node: ChildNode,
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): string {
  switch (node.type) {
    case TEXT_NODE:
      return node.value;
    case COMMENT_NODE:
      return `<!--${node.value}-->`;
    case INSERT_NODE:
      return `{${node.expression.getText(sourceFile)}}`;
    case ELEMENT_NODE:
    case COMPONENT_NODE:
      return renderElementToJsx(node, ts, sourceFile);
    default:
      return "";
  }
}

function renderElementToJsx(
  node: Extract<ChildNode, { type: typeof ELEMENT_NODE | typeof COMPONENT_NODE }>,
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): string {
  const tagName = node.name;
  const props = node.props.map((prop) => renderPropertyToJsx(prop, ts, sourceFile)).join(" ");
  const children = node.children.map((child) => renderNodeToJsx(child, ts, sourceFile)).join("");

  if (node.close === null) {
    const result = props ? `<${tagName} ${props} />` : `<${tagName} />`;
    return result;
  }

  const openTag = props ? `<${tagName} ${props}>` : `<${tagName}>`;
  const closeTag = `</${tagName}>`;

  return `${openTag}${children}${closeTag}`;
}

function renderPropertyToJsx(
  prop: Property,
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): string {
  switch (prop.type) {
    case BOOLEAN_PROPERTY:
      return prop.name;
    case STRING_PROPERTY:
      return `${prop.name}="${prop.value}"`;
    case DYNAMIC_PROPERTY:
      return `${prop.name}={${prop.expression.getText(sourceFile)}}`;
    case MIXED_PROPERTY: {
      const parts = prop.value.map((v) =>
        typeof v === "number" ? `{${prop.expressions[v]?.getText(sourceFile)}}` : v
      );
      return `${prop.name}="${parts.join("")}"`;
    }
    case SPREAD_PROPERTY:
      return `{...${prop.expression.getText(sourceFile)}}`;
    case ANONYMOUS_PROPERTY:
      return `{${prop.expression.getText(sourceFile)}}`;
    default:
      return "";
  }
}

export function sourceFileToJsx(
  ts: typeof import("typescript"),
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile
): string {
  const nodes = getSLDTemplatesNodes(ts, sourceFile);
  if (nodes.length === 0) {
    return "";
  }
  return nodes
    .map((node) => sldToJsx(ts, checker, sourceFile, node))
    .join("\n");
}
