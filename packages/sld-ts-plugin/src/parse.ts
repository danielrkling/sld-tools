import * as ts from "typescript/lib/tsserverlibrary";
import { INode, ITag, IText, parse, SyntaxKind, tokenize } from "html5parser";
import { isNumber, isString } from "./util";

export const marker = "⦿";
const match = /\${⦿*(\d)}/;
const onlyMatch = /^\${[⦿]*}/;

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
      if (position >= node.template.head.getStart() && position <= node.template.head.getEnd()) {
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

export function getTokenAtPosition(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  position: number
) {
  const template = getTemplateNodeAtPosition(ts, sourceFile, position);
  if (!template) return;
  const tokens = tokenizeTemplate(ts, sourceFile, template.template);

  const token = tokens.find((t) => t.start <= position && position <= t.end);
  return token;
}

// export function getNodeAtPosition(
//   ts: typeof import("typescript"),
//   sourceFile: ts.SourceFile,
//   position: number
// ) {
//   const template = getTemplateNodeAtPosition(ts, sourceFile, position);
//   if (!template) return;
//   const nodes = parseTemplate(ts, sourceFile, template.template);

//   let foundNode
//   nodes.children.forEach(function findNode(node,i){
//     if (node.type===COMPONENT_NODE || node.type === ELEMENT_NODE){
//       const child = node.children.forEach(findNode)
//       if (node.node.open.start <= position  && position <= node.node.open.end){
//         foundNode
//       }
//     }
//   })

//   const token = tokens.find((t) => t.start <= position && position <= t.end);
//   return token;
// }



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
        "${" +
        i.toString().padStart(exprText.length, marker) +
        "}" +
        span.literal.text;
    });
  }

  return preTemplate + templateText + postTemplate;
}

export function tokenizeTemplate(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  template: ts.TemplateLiteral
) {
  return tokenize(getTemplateHTML(ts, sourceFile, template));
}

export function parseTemplate(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  template: ts.TemplateLiteral
) {
  const html = getTemplateHTML(ts, sourceFile, template);
  const ast = parse(html);
  const nodes = parseNodes(ast);
  // console.log(JSON.stringify(nodes,null,2))
  return {
    type: ROOT_NODE,
    children: nodes,
  };
}

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
  value: number; //index of hole
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
  node: ITag;
};

export const COMPONENT_NODE = 5;
export type ComponentNode = {
  type: typeof COMPONENT_NODE;
  name: string;
  props: Property[];
  children: ChildNode[];
  node: ITag;
};

export const ROOT_NODE = 6;
export type RootNode = {
  type: typeof ROOT_NODE;
  children: ChildNode[];
};

export type ChildNode =
  | TextNode
  | ComponentNode
  | ElementNode
  | InsertNode
  | CommentNode;

export const BOOLEAN_PROP = 1;
export type BooleanProp = {
  type: typeof BOOLEAN_PROP;
  name: string;
  value: true;
};
export const STATIC_PROP = 2;
export type StaticProp = {
  type: typeof STATIC_PROP;
  name: string;
  value: string;
};
export const DYNAMIC_PROP = 3;
export type DynamicProp = {
  type: typeof DYNAMIC_PROP;
  name: string;
  value: number;
};
export const MIXED_PROP = 4;
export type MixedProp = {
  type: typeof MIXED_PROP;
  name: string;
  value: Array<string | number>;
};
export const SPREAD_PROP = 5;
export type SpreadProp = {
  type: typeof SPREAD_PROP;
  name: "...";
  value: number;
};

export type Property =
  | BooleanProp
  | StaticProp
  | DynamicProp
  | MixedProp
  | SpreadProp;

function parseNodes(nodes: INode[]) {
  return nodes.flatMap(parseNode);
}

//Parse html5parser result for what we care about
function parseNode(node: INode): ChildNode | ChildNode[] {
  //Text nodes are either static text or holes to insert in
  if (node.type === SyntaxKind.Text) {
    const parts = getParts(node.value);
    return parts.map((value, i) => {
      const type = isString(value) ? TEXT_NODE : INSERT_NODE;
      return {
        type,
        value,
      } as InsertNode | TextNode;
    });
  }

  //html5parser represents comments as type tag with name "!" or ""
  if (node.name[0] === "!" || node.name === "") {
    return {
      type: COMMENT_NODE,
      value: (node.body as IText[]).reduce((p, v) => (p += v.value), ""),
      start: node.start,
      end: node.end,
    } as CommentNode;
  }

  const props = node.attributes.flatMap((v) => {
    const nameParts = getParts(v.name.value);

    if (nameParts.length === 1) {
      const part = nameParts[0];
      if (isString(part)) {
        const valueParts = getParts(v.value?.value);
        if (valueParts.length === 0) {
          //boolean attribute <input disabled>
          return {
            type: BOOLEAN_PROP,
            name: part,
            value: true,
          } as BooleanProp;
        } else if (valueParts.length === 1) {
          if (isString(valueParts[0])) {
            return {
              type: STATIC_PROP,
              name: part,
              value: valueParts[0],
            } as StaticProp;
          } else {
            return {
              type: DYNAMIC_PROP,
              name: part,
              value: valueParts[0],
            } as DynamicProp;
          }
        } else {
          //mixed static and dynamic attribute <input value="text ${} text ${} px">
          return {
            type: MIXED_PROP,
            name: part,
            value: valueParts,
          } as MixedProp;
        }
      }
    } else {
      //name is mixed static and dynamic. We assume something like ...${} but could also be class${} or style${}. Value gets ignored in this case.
      if (nameParts[0] === "...") {
        return {
          type: SPREAD_PROP,
          name: "...",
          value: nameParts[1],
        } as SpreadProp;
      }
    }
    return [];
  }) as Property[];

  const children = node.body?.flatMap(parseNode) ?? [];
  const name = node.rawName as string;

  return {
    type: /^[A-Z]/.test(name) ? COMPONENT_NODE : ELEMENT_NODE,
    name,
    props,
    children,
    node,
  };
}

function getParts(value: string = ""): Array<string | number> {
  return value
    .split(match)
    .map((v, i) => (i % 2 === 1 ? Number(v) : v))
    .filter((v) => isNumber(v) || v.trim());
}
