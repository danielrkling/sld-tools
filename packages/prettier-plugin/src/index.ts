import type { Plugin, Options } from "prettier";
import tsParser from "prettier/parser-typescript";
import babelParser from "prettier/parser-babel";
import * as embedPlugin from "prettier-plugin-embed";
import { builders as docBuilders } from "prettier/doc";
import {
  tokenize,
  parse,
  type RootNode,
  type ElementNode,
} from "parse-tagged-jsx";
import ts from "typescript";

const DEFAULT_TAGS = ["jsx"];

export interface PluginOptions extends Options {
  embeddedJsxTags?: string[];
  useCallbacks?: boolean;
}

const {
  group: group,
  indent: indent,
  softline: softline,
  hardline: hardline,
  line: docLine,
  lineSuffixBoundary: lineSuffixBoundary,
  join: docJoin,
  ifBreak: ifBreak,
} = docBuilders;

const printJsx = (
  node: RootNode,
  printExpression: (idx: number) => any,
  options: PluginOptions,
): any => {
  const children = node.children;

  const printChildren = (childrenToPrint: any[]): any[] => {
    const parts: any[] = [];
    
    // Filter out whitespace-only text nodes
    const validChildren = childrenToPrint.filter(
      (c) => c.type !== "TEXT" || c.value.trim() !== ""
    );
    const childCount = validChildren.length;

    for (let i = 0; i < childCount; i++) {
      const child = validChildren[i];
      const nextChild = validChildren[i + 1];

      if (child.type === "TEXT") {
        // Replace multiple whitespace/newlines with a single space,
        // but preserve trailing/leading space if it's adjacent to an expression.
        const textVal = child.value.replace(/\s+/g, " ");
        
        // If it's the first child and starts with a space, trim it
        let finalVal = textVal;
        if (i === 0 && finalVal.startsWith(" ")) finalVal = finalVal.substring(1);
        // If it's the last child and ends with a space, trim it
        if (i === childCount - 1 && finalVal.endsWith(" ")) finalVal = finalVal.substring(0, finalVal.length - 1);
        
        parts.push(finalVal);
      } else if (child.type === "EXPRESSION") {
        const printed = printExpression(child.value as number);
        parts.push(["${", printed, "}"]);
      } else if (child.type === "ELEMENT") {
        parts.push(printElement(child));
      } else if (child.type === "COMMENT") {
        parts.push("<!--");
        for (const c of child.children) {
          if (c.type === "TEXT") {
            parts.push(c.value.trim());
          } else if (c.type === "EXPRESSION") {
            const printed = printExpression(c.value as number);
            parts.push(["${", printed, "}"]);
          }
        }
        parts.push("-->");
      }

      if (nextChild && (child.type === "ELEMENT" || nextChild.type === "ELEMENT")) {
        parts.push(hardline);
      }
    }
    return parts;
  };

  const printElement = (el: ElementNode): any => {
    const tagNameDoc = typeof el.name === "number" ? ["${", printExpression(el.name), "}"] : el.name;
    const props = el.props;
    const elChildren = el.children;
    const isSelfClosing = elChildren.length === 0 || !!el.tokens.openTag.slash;

    const attrDocs: any[] = [];
    for (let pi = 0; pi < props.length; pi++) {
      const prop = props[pi];
      if (prop.type === "BOOLEAN") {
        attrDocs.push(prop.name);
      } else if (prop.type === "STRING") {
        const quote = prop.value.includes('"') ? "'" : '"';
        attrDocs.push(`${prop.name}=${quote}${prop.value}${quote}`);
      } else if (prop.type === "EXPRESSION") {
        const printed = printExpression(Number(prop.value));
        attrDocs.push([prop.name, "=${", printed, "}"]);
      } else if (prop.type === "SPREAD") {
        const printed = printExpression(Number(prop.value));
        attrDocs.push(["${", printed, "}"]);
      }
    }

    const hasManyAttrs = attrDocs.length > 2;
    const hasSpread = props.some((p: any) => p.type === "SPREAD");
    const hasElement = elChildren.some((c: any) => c.type === "ELEMENT");

    if (isSelfClosing) {
      if (hasManyAttrs || hasSpread) {
        return group(
          [
            "<",
            tagNameDoc,
            indent([docLine, docJoin(docLine, attrDocs)]),
            docLine,
            "/>",
          ],
          { shouldBreak: true },
        );
      }
      return ["<", tagNameDoc, attrDocs.length ? [" ", docJoin(" ", attrDocs)] : [], " />"];
    }

    if (hasManyAttrs || hasSpread) {
      return group(
        [
          "<",
          tagNameDoc,
          indent([docLine, docJoin(docLine, attrDocs)]),
          docLine,
          ">",
          indent(hasElement ? [hardline, printChildren(elChildren)] : printChildren(elChildren)),
          hasElement ? hardline : "",
          "</",
          tagNameDoc,
          ">",
        ],
        { shouldBreak: true },
      );
    }

    if (elChildren.length > 0) {
      if (hasElement) {
        return group(
          [
            "<",
            tagNameDoc,
            attrDocs.length ? [" ", docJoin(" ", attrDocs)] : [],
            ">",
            indent([hardline, printChildren(elChildren)]),
            hardline,
            "</",
            tagNameDoc,
            ">",
          ],
          { shouldBreak: true }
        );
      }

      return [
        "<",
        tagNameDoc,
        attrDocs.length ? [" ", docJoin(" ", attrDocs)] : [],
        ">",
        printChildren(elChildren),
        "</",
        tagNameDoc,
        ">",
      ];
    }

    return ["<", tagNameDoc, ">"];
  };

  if (children.length === 1 && children[0].type === "ELEMENT") {
    return printElement(children[0]);
  }

  return printChildren(children);
};

const createPlugin = (tags: string[] = DEFAULT_TAGS, useCallbacks: boolean = false): Plugin => {
  const embedEstree = (embedPlugin as any).printers?.estree || (embedPlugin as any).default?.printers?.estree;
  const plugin: Plugin = {
    parsers: {
      babel: {
        ...babelParser.parsers.babel,
        astFormat: "estree",
      },
      typescript: {
        ...tsParser.parsers.typescript,
        astFormat: "estree",
      },
    },
    printers: {
      estree: {
        ...embedEstree,
        embed(path, options) {
          const node = path.node as any;
          if (node.type === "TaggedTemplateExpression") {
            const tagName =
              node.tag.type === "Identifier"
                ? node.tag.name
                : node.tag.property?.name;

            if (tagName && tags.includes(tagName)) {
                return async (textToDoc, print, path) => {
                 // If useCallbacks is enabled, transform the code first
                 if (useCallbacks) {
                   try {
                     const transformModule = await import("transform-tagged-jsx");
                     const tsModule = await import("typescript");
                     const callbacks = transformModule.createExpressionTransformCallbacks(tsModule);
                     const code = node.quasi.parent?.text || "";
                     const transformed = transformModule.toTagged(code, callbacks);
                     if (transformed !== code) {
                       return transformed;
                     }
                   } catch (e) {
                     // Fall through to normal formatting if transform fails
                   }
                 }

                 const rawStrings = node.quasi.quasis.map((q: any) => q.value.raw);
                 const templateStrings = Object.assign(rawStrings, {
                   raw: rawStrings,
                 });

                 const tokens = tokenize(templateStrings as any);
                 const ast = parse(tokens);

                 const printExpression = (idx: number) => {
                   return path.call(print, "quasi", "expressions", idx);
                 };

                 return group([
                   print("tag"),
                   "`",
                   indent([softline, printJsx(ast, printExpression, options as any)]),
                   softline,
                   "`",
                 ]);
               };
            }
          }
          if (node.type === "TemplateLiteral" && path.parent?.type === "TaggedTemplateExpression") {
            const tagName = path.parent.tag.type === "Identifier" ? path.parent.tag.name : path.parent.tag.property?.name;
            if (tagName && tags.includes(tagName)) {
              return undefined;
            }
          }
          if (embedEstree && embedEstree.embed) {
            return embedEstree.embed(path, options);
          }
          return undefined;
        },
      },
    },
  };
  return plugin;
};

const plugin = createPlugin(DEFAULT_TAGS);

export default plugin;
export { createPlugin };

// Export a factory function that creates a plugin with callbacks enabled
export function createPluginWithCallbacks(tags?: string[]): Plugin {
  return createPlugin(tags || DEFAULT_TAGS, true);
}
