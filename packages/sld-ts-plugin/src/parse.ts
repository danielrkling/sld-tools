import * as ts from "typescript/lib/tsserverlibrary";
import {
  IAttribute,
  INode,
  ITag,
  IText,
  parse as html5parse,
  SyntaxKind,
  tokenize,
} from "html5parser";
import {
  getFunctionTypeFromTemplate,
  getPropertyTypeFromTemplate,
} from "./diagnostics";

import { isNumber, isString } from "./util";

//AST Node types

//Non reactive text
export const TEXT_NODE = 1;
export type TextNode = {
  type: typeof TEXT_NODE;
  value: string;
  start: number;
  end: number;
};

//Non reactive Comment Node <!--value-->
export const COMMENT_NODE = 2;
export type CommentNode = {
  type: typeof COMMENT_NODE;
  value: string;
  start: number;
  end: number;
};

//Reactive Hole
export const INSERT_NODE = 3;
export type InsertNode = {
  type: typeof INSERT_NODE;
  start: number;
  end: number;
  expression: ts.Expression;
};

//tag with lowercase first letter <div />
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

//Tag with capital first letter <Div />
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

// <input disabled>
export const BOOLEAN_PROPERTY = 1;
export type BooleanProperty = {
  type: typeof BOOLEAN_PROPERTY;
  name: string;
  start: number;
  end: number;
};

// <input value="myString"> <input value='myString'> <input value=""> <input value=''>
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

// <input value=${}> <input value="${}""> <input value='${}'>
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

// <input value=" ${}"> <input value="input-${}"> <input value='${"value1"} ${"value2"}'>
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

// <input ...${} />
export const SPREAD_PROPERTY = 5;
export type SpreadProperty = {
  type: typeof SPREAD_PROPERTY;
  expression: ts.Expression;
  start: number;
  end: number;
};

// <input ${} />
export const ANONYMOUS_PROPERTY = 6;
export type AnonymousProperty = {
  type: typeof ANONYMOUS_PROPERTY;
  expression: ts.Expression;
  start: number;
  end: number;
};

//string or boolean means static, number means hole and is index, array means mix of string and holes
export type ValueParts = string | boolean | number | Array<string | number>;

//Needs to be unique character that would never be in the template literal
const marker = "⧙";
const filler = "�";
//Captures index of hole
const match = new RegExp(`${marker}${filler}*(\\d+)${marker}`, "g");

export function getSLDTemplatesNodes(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
) {
  const nodes: ts.TaggedTemplateExpression[] = [];
  if (sourceFile) {
    // Find all tagged template literals named "sld".
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
  const html = getTemplateHTML(ts, sourceFile, node.template);
  const ast = html5parse(html);
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
  const root = {
    type: ROOT_NODE,
    children: [] as ChildNode[],
    start: node.getStart(sourceFile),
    end: node.getEnd(),
    components,
    elements,
  } as RootNode;
  root.children = parseNodes(ast, spans, root, checker);

  return root;
}

export function getTemplateHTML(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  template: ts.TemplateLiteral
) {
  const fullText = sourceFile.getFullText();

  // Pre-template slice: exactly from start of file to template start
  const preTemplate = fullText
    .slice(0, template.getStart() + 1)
    .replace(/\S/g, " ");

  // Post-template slice: from template end to end of file
  const postTemplate = fullText
    .slice(template.getEnd() - 1)
    .replace(/\S/g, " ");

  let templateText = "";

  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    templateText = template.text;
  } else if (ts.isTemplateExpression(template)) {
    templateText = template.head.text;
    template.templateSpans.forEach((span, i) => {
      const exprText = span.expression.getText(sourceFile);

      templateText +=
        marker +
        i.toString().padStart(exprText.length+1, filler) +
        marker +
        span.literal.text;
    });
  }

  return preTemplate + templateText + postTemplate;
}

function parseNodes(
  nodes: INode[],
  templateSpans: readonly ts.TemplateSpan[],
  root: RootNode,
  checker: ts.TypeChecker
): ChildNode[] {
  return nodes.flatMap((n) => parseNode(n, templateSpans, root, checker));
}

//Parse html5parser result for what we care about
function parseNode(
  node: INode,
  templateSpans: readonly ts.TemplateSpan[],
  root: RootNode,
  checker: ts.TypeChecker
): ChildNode | ChildNode[] {
  //Text nodes are either static text or holes to insert in
  if (node.type === SyntaxKind.Text) {
    return node.value.split(match).flatMap((value, index, array) => {
      if (index % 2 === 1) {
        return {
          type: INSERT_NODE,
          start: node.start,
          end: node.end,
          expression: templateSpans?.[parseInt(value)].expression!,
        };
      }
      //We want to trim when only content in textnode is the hole or if textnode is empty
      if (!value || (array.length === 3 && !value.trim())) {
        return [];
      }

      return {
        type: TEXT_NODE,
        value,
        start: node.start,
        end: node.end,
      };
    });
  }

  //html5parser represents comments as type tag with name "!" or ""
  if (node.name[0] === "!" || node.name === "") {
    return {
      type: COMMENT_NODE,
      value: (node.body as IText[]).join(""),
      start: node.start,
      end: node.end,
    } as CommentNode;
  }

  const props = node.attributes.flatMap((v) => {
    const nameParts = getParts(v.name.value);

    if (nameParts.length === 1) {
      const name = nameParts[0];
      if (v.value === undefined) {
        return {
          name,
          type: BOOLEAN_PROPERTY,
          start: v.name.start,
          end: v.name.end,
        };
      }

      if (isNumber(name)) {
        return {
          type: ANONYMOUS_PROPERTY,
          expression: templateSpans?.[name].expression!,
          start: v.name.start,
          end: v.name.end,
        };
      }

      const valueParts = getParts(v.value?.value);

      if (valueParts.length === 0) {
        return {
          name,
          type: BOOLEAN_PROPERTY,
        };
      } else if (valueParts.length === 1) {
        const value = valueParts[0];
        if (isNumber(value)) {
          return {
            type: DYNAMIC_PROPERTY,
            name,
            expression: templateSpans?.[value].expression!,
            start: v.name.start,
            end: v.name.end,
          };
        } else {
          return {
            type: STRING_PROPERTY,
            name,
            value,
            start: v.name.start,
            end: v.name.end,
            nameLocation: {
              start: v.name.start,
              end: v.name.end,
            },
            valueLocation: {
              start: v.value.start,
              end: v.value.end,
            },
          };
        }
      } else {
        return {
          type: MIXED_PROPERTY,
          name,
          value: valueParts,
        };
      }
    }

    //name is mixed static and dynamic. We only look for ...${}
    if (nameParts[0] === "...") {
      return {
        type: SPREAD_PROPERTY,
        start: v.name.start,
        end: v.name.end,
        expression: templateSpans?.[nameParts[1] as number].expression!,
      };
    }

    return [];
  }) as Property[];

  const children = parseNodes(node.body ?? [], templateSpans, root, checker);
  const name = node.rawName as string;
  const type = /^[A-Z]/.test(name) ? COMPONENT_NODE : ELEMENT_NODE;

  let tsType: ts.Type | undefined = undefined;
  if (type === COMPONENT_NODE) {
    const sym = checker.getPropertyOfType(root.components, name);
    tsType =
      sym && checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration!);
  } else {
    const sym = checker.getPropertyOfType(root.elements, name);
    tsType =
      sym && checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration!);
  }

  return {
    type,
    name,
    props,
    children,
    open: {
      start: node.start,
      end: node.open.end,
    },
    close: node.close && {
      start: node.close.start,
      end: node.close.end,
    },
    start: node.start,
    end: node.end,
    tsType,
  } as ElementNode | ComponentNode;
}

// Splits a string into static parts and hole indexes
function getParts(value: string = ""): Array<string | number> {
  return value
    .split(match)
    .map((v, i) => (i % 2 === 1 ? parseInt(v) : v))
    .filter((v) => isNumber(v) || v !== "");
}
