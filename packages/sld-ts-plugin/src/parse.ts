import * as ts from "typescript/lib/tsserverlibrary";
import {
  IRoot,
  IChild,
  IElement,
  IText,
  IInsert,
  IProperty,
  INodeType,
  parse as sldParse,
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
  const templates = getTemplateStringsArray(ts, sourceFile, node.template);
  const sldRoot = sldParse(templates);
  
  let spans = [] as readonly ts.TemplateSpan[];
  if (ts.isTemplateExpression(node.template)) {
    spans = node.template.templateSpans;
  }

  const sym = checker.getSymbolAtLocation(node.tag)!;
  const type = checker.getTypeOfSymbolAtLocation(sym, node);
  const components = checker.getTypeOfSymbolAtLocation(
    type.getProperty("components")!,
    node
  );
  const elements = checker.getTypeOfSymbolAtLocation(
    type.getProperty("elements")!,
    node
  );
  
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
): TemplateStringsArray {
  const strings: string[] = [];
  const rawStrings: string[] = [];
  
  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    strings.push(template.text);
    rawStrings.push(template.text);
  } else if (ts.isTemplateExpression(template)) {
    strings.push(template.head.text);
    rawStrings.push(template.head.text);
    for (const span of template.templateSpans) {
      strings.push(span.literal.text);
      rawStrings.push(span.literal.text);
    }
  }
  
  return Object.assign(strings, { raw: rawStrings }) as TemplateStringsArray;
}

function convertChildren(
  children: IChild[],
  templateSpans: readonly ts.TemplateSpan[],
  root: RootNode,
  checker: ts.TypeChecker,
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): ChildNode[] {
  return children.flatMap((child) => convertNode(child, templateSpans, root, checker, ts, sourceFile));
}

function convertNode(
  node: IChild,
  templateSpans: readonly ts.TemplateSpan[],
  root: RootNode,
  checker: ts.TypeChecker,
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): ChildNode | ChildNode[] {
  switch (node.type) {
    case INodeType.Text:
      return {
        type: TEXT_NODE,
        value: node.value,
        start: node.start,
        end: node.end,
      };
    case INodeType.Insert:
      return {
        type: INSERT_NODE,
        start: node.start,
        end: node.end,
        expression: templateSpans?.[node.index]?.expression!,
      };
    case INodeType.Comment:
      return {
        type: COMMENT_NODE,
        value: node.value,
        start: node.start,
        end: node.end,
      };
    case INodeType.Element:
      return convertElement(node, templateSpans, root, checker, ts, sourceFile);
    default:
      return [];
  }
}

function convertElement(
  node: IElement,
  templateSpans: readonly ts.TemplateSpan[],
  root: RootNode,
  checker: ts.TypeChecker,
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): ElementNode | ComponentNode {
  const name = node.name.value;
  const type = /^[A-Z]/.test(name) ? COMPONENT_NODE : ELEMENT_NODE;
  
  const props: Property[] = node.props.map((prop) => convertProperty(prop, templateSpans, ts, sourceFile));
  const children = convertChildren(node.children, templateSpans, root, checker, ts, sourceFile);
  
  let tsType: ts.Type | undefined;
  if (type === COMPONENT_NODE) {
    const sym = checker.getPropertyOfType(root.components, name);
    tsType = sym && checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration!);
  } else {
    const sym = checker.getPropertyOfType(root.elements, name);
    tsType = sym && checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration!);
  }
  
  return {
    type,
    name,
    props,
    children,
    open: {
      start: node.open.start,
      end: node.open.end,
    },
    close: node.close ? {
      start: node.close.start,
      end: node.close.end,
    } : null,
    start: node.start,
    end: node.end,
    tsType,
  };
}

function convertProperty(
  prop: IProperty,
  templateSpans: readonly ts.TemplateSpan[],
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): Property {
  const name = prop.name.value;
  
  switch (prop.type) {
    case INodeType.BooleanProperty:
      return {
        type: BOOLEAN_PROPERTY,
        name,
        start: prop.start,
        end: prop.end,
      };
    case INodeType.StringProperty:
      return {
        type: STRING_PROPERTY,
        name,
        value: prop.value,
        start: prop.start,
        end: prop.end,
        nameLocation: {
          start: prop.name.start,
          end: prop.name.end,
        },
        valueLocation: {
          start: prop.start,
          end: prop.end,
        },
      };
    case INodeType.DynamicProperty:
      return {
        type: DYNAMIC_PROPERTY,
        name,
        nameLocation: {
          start: prop.name.start,
          end: prop.name.end,
        },
        valueLocation: {
          start: prop.start,
          end: prop.end,
        },
        expression: templateSpans?.[prop.valueIndex]?.expression!,
        start: prop.start,
        end: prop.end,
      };
    case INodeType.MixedProperty:
      const values = Array.isArray(prop.values) 
        ? prop.values 
        : [typeof prop.values === 'string' ? prop.values : ''];
      const expressions: ts.Expression[] = [];
      const processedValues = values.map((v) => {
        if (typeof v === 'number') {
          expressions.push(templateSpans?.[v]?.expression!);
          return v;
        }
        return v;
      });
      return {
        type: MIXED_PROPERTY,
        name,
        value: processedValues,
        nameLocation: {
          start: prop.name.start,
          end: prop.name.end,
        },
        expressions,
        valueLocation: {
          start: prop.start,
          end: prop.end,
        },
        start: prop.start,
        end: prop.end,
      };
    default:
      return {
        type: BOOLEAN_PROPERTY,
        name,
        start: 0,
        end: 0,
      };
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
