import * as ts from "typescript/lib/tsserverlibrary";
import { tokenize, parse, RootNode, ElementNode, ChildNode, ParseJSXError } from "parse-jsx";
import { JsxTemplateNode, getTemplateStringsArray } from "./finder";

export interface ParsedJsxTemplate {
  root: RootNode;
  strings: string[];
  templateSpanExpressions: ts.Expression[];
  templateNode: JsxTemplateNode;
}

export interface JsxElementNode {
  type: "element";
  name: string | number;
  props: JsxPropNode[];
  children: JsxChildNode[];
  start: number;
  end: number;
}

export interface JsxTextNode {
  type: "text";
  value: string;
  start: number;
  end: number;
}

export interface JsxExpressionNode {
  type: "expression";
  index: number;
  start: number;
  end: number;
  expression: ts.Expression;
}

export type JsxChildNode = JsxElementNode | JsxTextNode | JsxExpressionNode;

export interface JsxBooleanProp {
  type: "boolean";
  name: string;
  start: number;
  end: number;
}

export interface JsxStringProp {
  type: "string";
  name: string;
  value: string;
  start: number;
  end: number;
}

export interface JsxExpressionProp {
  type: "expression";
  name: string;
  index: number;
  start: number;
  end: number;
  expression: ts.Expression;
}

export interface JsxSpreadProp {
  type: "spread";
  index: number;
  start: number;
  end: number;
  expression: ts.Expression;
}

export type JsxPropNode = JsxBooleanProp | JsxStringProp | JsxExpressionProp | JsxSpreadProp;

export function parseJsxTemplate(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  templateNode: JsxTemplateNode
): ParsedJsxTemplate {
  const { strings, templateSpanExpressions } = getTemplateStringsArray(
    ts,
    sourceFile,
    templateNode.node.template
  );

  const tokens = tokenize(strings as unknown as TemplateStringsArray);
  const root = parse(tokens);

  return {
    root,
    strings,
    templateSpanExpressions,
    templateNode,
  };
}

export function getJsxElementAtPosition(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  parsed: ParsedJsxTemplate,
  position: number
): JsxElementNode | undefined {
  const templateStart = parsed.templateNode.node.getStart(sourceFile) + 1;
  const adjustedPosition = position - templateStart;

  return findElementAtPosition(parsed.root.children, adjustedPosition);
}

function findElementAtPosition(
  children: ChildNode[],
  position: number
): JsxElementNode | undefined {
  for (const child of children) {
    if (child.type === "ELEMENT") {
      const element = convertElementNode(child);
      if (position >= element.start && position <= element.end) {
        return element;
      }
      const found = findElementAtPosition(child.children, position);
      if (found) return found;
    }
  }
  return undefined;
}

function convertElementNode(node: ElementNode): JsxElementNode {
  const props: JsxPropNode[] = [];
  const children: JsxChildNode[] = [];

  const openTag = node.tokens.openTag;
  const openStart = openTag.open.start;
  const openEnd = openTag.close?.end || openTag.name.end;

  for (const prop of node.props) {
    if (prop.type === "BOOLEAN") {
      props.push({
        type: "boolean",
        name: prop.name,
        start: prop.tokens.name.start,
        end: prop.tokens.name.end,
      });
    } else if (prop.type === "STRING") {
      props.push({
        type: "string",
        name: prop.name,
        value: prop.value,
        start: prop.tokens.name.start,
        end: prop.tokens.string.end,
      });
    } else if (prop.type === "EXPRESSION") {
      const nameEnd = prop.tokens.name.end;
      props.push({
        type: "expression",
        name: prop.name,
        index: prop.value,
        start: prop.tokens.name.start,
        end: nameEnd + 3, // ={
        expression: {} as ts.Expression,
      });
    } else if (prop.type === "SPREAD") {
      props.push({
        type: "spread",
        index: prop.value,
        start: prop.tokens.spread.start,
        end: prop.tokens.spread.end + 1, // ...
        expression: {} as ts.Expression,
      });
    }
  }

  for (const child of node.children) {
    if (child.type === "TEXT") {
      children.push({
        type: "text",
        value: child.value,
        start: child.tokens.text.start,
        end: child.tokens.text.end,
      });
    } else if (child.type === "EXPRESSION") {
      const exprPos = child.tokens.expression.value;
      children.push({
        type: "expression",
        index: child.value,
        start: exprPos,
        end: exprPos + 2, // ${x}
        expression: {} as ts.Expression,
      });
    }
  }

  const nameToken = openTag.name;
  const closeTag = node.tokens.closeTag;

  return {
    type: "element",
    name: node.name,
    props,
    children,
    start: nameToken.start,
    end: closeTag ? closeTag.close.end : openEnd,
  };
}

export function mapPositionToTemplate(
  templateNode: JsxTemplateNode,
  sourceFile: ts.SourceFile,
  relativePosition: number
): number {
  const templateStart = templateNode.node.getStart(sourceFile) + 1;
  return templateStart + relativePosition;
}
