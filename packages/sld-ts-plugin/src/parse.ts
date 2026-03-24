import * as ts from "typescript/lib/tsserverlibrary";
import {
  tokenize,
  parse,
  RootNode as SldRootNode,
  ElementNode as SldElementNode,
  TextNode as SldTextNode,
  ExpressionNode as SldExpressionNode,
  ChildNode as SldChildNode,
  PropNode as SldPropNode,
  ROOT_NODE as SLD_ROOT_NODE,
  ELEMENT_NODE as SLD_ELEMENT_NODE,
  TEXT_NODE as SLD_TEXT_NODE,
  EXPRESSION_NODE as SLD_EXPRESSION_NODE,
  BOOLEAN_PROP as SLD_BOOLEAN_PROP,
  STATIC_PROP as SLD_STRING_PROP,
  EXPRESSION_PROP as SLD_EXPRESSION_PROP,
  SPREAD_PROP as SLD_SPREAD_PROP,
} from "sld-parse";
import {
  getFunctionTypeFromTemplate,
  getPropertyTypeFromTemplate,
} from "./diagnostics";

import { isNumber, isString } from "./util";

export const TEXT_NODE = 1;
export type TextNode = {
  type: typeof TEXT_NODE;
  value: string;
  start: number;
  end: number;
};

export const COMMENT_NODE = 2;
export type CommentNode = {
  type: typeof COMMENT_NODE;
  value: string;
  start: number;
  end: number;
};

export const INSERT_NODE = 3;
export type InsertNode = {
  type: typeof INSERT_NODE;
  start: number;
  end: number;
  expression: ts.Expression;
};

export const ELEMENT_NODE = 4;
export type ElementNode = {
  type: typeof ELEMENT_NODE;
  name: string;
  props: Property[];
  children: ChildNode[];
  open: {
    start: number;
    end: number;
  };
  close: {
    start: number;
    end: number;
  } | null;
  start: number;
  end: number;
  tsType: ts.Type | undefined;
};

export const COMPONENT_NODE = 5;
export type ComponentNode = {
  type: typeof COMPONENT_NODE;
  name: string;
  props: Property[];
  children: ChildNode[];
  open: {
    start: number;
    end: number;
  };
  close: {
    start: number;
    end: number;
  } | null;
  start: number;
  end: number;
  tsType: ts.Type | undefined;
};

export const ROOT_NODE = 6;
export type RootNode = {
  type: typeof ROOT_NODE;
  children: ChildNode[];
  start: number;
  end: number;
  components: ts.Type;
  elements: ts.Type;
};

export type ChildNode =
  | TextNode
  | ComponentNode
  | ElementNode
  | InsertNode
  | CommentNode;

export type Property =
  | BooleanProperty
  | StringProperty
  | DynamicProperty
  | MixedProperty
  | SpreadProperty
  | AnonymousProperty;

export const BOOLEAN_PROPERTY = 1;
export type BooleanProperty = {
  type: typeof BOOLEAN_PROPERTY;
  name: string;
  start: number;
  end: number;
};

export const STRING_PROPERTY = 2;
export type StringProperty = {
  type: typeof STRING_PROPERTY;
  name: string;
  value: string;
  start: number;
  end: number;
  nameLocation: {
    start: number;
    end: number;
  };
  valueLocation: {
    start: number;
    end: number;
  };
};

export const DYNAMIC_PROPERTY = 3;
export type DynamicProperty = {
  type: typeof DYNAMIC_PROPERTY;
  name: string;
  nameLocation: {
    start: number;
    end: number;
  };
  valueLocation: {
    start: number;
    end: number;
  };
  expression: ts.Expression;
  start: number;
  end: number;
};

export const MIXED_PROPERTY = 4;
export type MixedProperty = {
  type: typeof MIXED_PROPERTY;
  name: string;
  value: Array<string | number>;
  nameLocation: {
    start: number;
    end: number;
  };
  expressions: ts.Expression[];
  valueLocation: {
    start: number;
    end: number;
  };
  start: number;
  end: number;
};

export const SPREAD_PROPERTY = 5;
export type SpreadProperty = {
  type: typeof SPREAD_PROPERTY;
  expression: ts.Expression;
  start: number;
  end: number;
};

export const ANONYMOUS_PROPERTY = 6;
export type AnonymousProperty = {
  type: typeof ANONYMOUS_PROPERTY;
  expression: ts.Expression;
  start: number;
  end: number;
};

export type ValueParts = string | boolean | number | Array<string | number>;

export function getSLDTemplatesNodes(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
) {
  const nodes: ts.TaggedTemplateExpression[] = [];
  if (sourceFile) {
    ts.forEachChild(sourceFile, function visit(node) {
      if (ts.isTaggedTemplateExpression(node)) {
        const tagName = node.tag.getText(sourceFile);
        if (/sld/i.test(tagName)) {
          nodes.push(node);
        }
      }
      ts.forEachChild(node, visit);
    });
  }
  return nodes;
}

export function getRootAtPosition(
  ts: typeof import("typescript"),
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  position: number
): RootNode | undefined {
  const templateNode = getTemplateNodeAtPosition(ts, sourceFile, position);
  if (!templateNode) return;
  const root = parseSLDTemplate(ts, checker, sourceFile, templateNode);
  return root;
}

export function getNodeAtPosition(
  ts: typeof import("typescript"),
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  position: number
) {
  const templateNode = getTemplateNodeAtPosition(ts, sourceFile, position);
  if (!templateNode) return;
  const root = parseSLDTemplate(ts, checker, sourceFile, templateNode);
  return getNodeInRootAtPosition(root, position);
}

export function getNodeInRootAtPosition(
  root: RootNode,
  position: number
): ChildNode | undefined {
  let foundNode: ChildNode | undefined;
  root.children.forEach(findNode);
  return foundNode;
  function findNode(node: ChildNode) {
    switch (node.type) {
      case TEXT_NODE:
      case COMMENT_NODE:
      case INSERT_NODE:
        if (position >= node.start && position <= node.end) {
          foundNode = node;
        }
        break;
      case ELEMENT_NODE:
      case COMPONENT_NODE:
        if (position >= node.open.start && position <= node.open.end) {
          return (foundNode = node);
        }
        if (
          node.close &&
          position >= node.close.start &&
          position <= node.close.end
        ) {
          return (foundNode = node);
        }
        if (position >= node.start && position <= node.end) {
          foundNode = node;
          node.children.forEach(findNode);
        }
    }
  }
}

export function getTemplateNodeAtPosition(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  position: number
) {
  const nodes = getSLDTemplatesNodes(ts, sourceFile);
  const node = nodes.find((node) => {
    if (ts.isNoSubstitutionTemplateLiteral(node.template)) {
      if (position >= node.getStart() && position <= node.getEnd()) {
        return true;
      }
    } else if (ts.isTemplateExpression(node.template)) {
      if (
        position >= node.template.head.getStart() &&
        position <= node.template.head.getEnd()
      ) {
        return true;
      }
      for (const span of node.template.templateSpans) {
        if (
          position >= span.literal.getStart() &&
          position <= span.literal.getEnd()
        ) {
          return true;
        }
      }
    }
  });
  return node;
}

export function parseSLDTemplate(
  ts: typeof import("typescript"),
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  node: ts.TaggedTemplateExpression
): RootNode {
  const { strings, expressions } = getTemplateStringsArray(ts, sourceFile, node.template);
  const tokens = tokenize(strings);
  const sldRoot = parse(tokens);
  
  let spans: ts.Expression[] = [];
  if (ts.isTemplateExpression(node.template)) {
    spans = node.template.templateSpans.map(span => span.expression);
  }

  const sym = checker.getSymbolAtLocation(node.tag)!;
  const type = checker.getTypeOfSymbolAtLocation(sym, node);
  const typeArgs = checker.getTypeArguments(type as ts.TypeReference);
  const components = typeArgs[0] || type;
  const elements = typeArgs[1] || components;
  
  const root: RootNode = {
    type: ROOT_NODE,
    children: [],
    start: node.getStart(sourceFile),
    end: node.getEnd(),
    components,
    elements,
  };
  
  root.children = convertChildren(sldRoot.children, spans, root, checker, ts, sourceFile);
  return root;
}

function getTemplateStringsArray(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  template: ts.TemplateLiteral
): { strings: string[]; expressions: ts.Expression[] } {
  const strings: string[] = [];
  const expressions: ts.Expression[] = [];
  
  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    strings.push(template.text);
  } else if (ts.isTemplateExpression(template)) {
    strings.push(template.head.text);
    for (const span of template.templateSpans) {
      expressions.push(span.expression);
      strings.push(span.literal.text);
    }
  }
  
  return { strings, expressions };
}

function convertChildren(
  children: SldChildNode[],
  templateSpans: ts.Expression[],
  root: RootNode,
  checker: ts.TypeChecker,
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): ChildNode[] {
  return children.flatMap((child) => convertNode(child, templateSpans, root, checker, ts, sourceFile));
}

function convertNode(
  node: SldChildNode,
  templateSpans: ts.Expression[],
  root: RootNode,
  checker: ts.TypeChecker,
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): ChildNode | ChildNode[] {
  switch (node.type) {
    case SLD_TEXT_NODE:
      return {
        type: TEXT_NODE,
        value: node.value,
        start: 0,
        end: 0,
      };
    case SLD_EXPRESSION_NODE:
      return {
        type: INSERT_NODE,
        start: 0,
        end: 0,
        expression: templateSpans[node.value] || ({} as ts.Expression),
      };
    default:
      return [];
  }
}

export function getTemplateHTML(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  template: ts.TemplateLiteral
) {
  const fullText = sourceFile.getFullText();
  const preTemplate = fullText.slice(0, template.getStart() + 1).replace(/\S/g, " ");
  const postTemplate = fullText.slice(template.getEnd() - 1).replace(/\S/g, " ");
  
  let templateText = "";
  
  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    templateText = template.text;
  } else if (ts.isTemplateExpression(template)) {
    templateText = template.head.text;
    template.templateSpans.forEach((span, i) => {
      templateText += `<expr>${i}</expr>${span.literal.text}`;
    });
  }
  
  return preTemplate + templateText + postTemplate;
}
