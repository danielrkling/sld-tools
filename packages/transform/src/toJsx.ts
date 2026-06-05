import { tokenize, parse, RootNode } from "@tagged-jsx/parse";
import { attachWhitespaceInfo, getPropWhitespaceBefore, getElementWhitespaceBeforeFirstProp, getElementWhitespaceAfterLastProp } from "./attachWhitespace";
import { computeMappings } from "./mappings";
import type { MappingResult } from "./mappings";
import type * as tsModule from "typescript";
import type { TransformerCallbacks, TransformError } from "./types";

export function createJsxTransformer(
  tags: string[],
  ts: typeof tsModule,
  callbacks?: TransformerCallbacks
) {
  function findFirstTaggedTemplate(
    node: tsModule.Node,
  ): tsModule.TaggedTemplateExpression | undefined {
    if (ts.isTaggedTemplateExpression(node)) {
      const tag = node.tag;
      if (ts.isIdentifier(tag) && tags.includes(tag.text)) {
        return node;
      }
    }

    return ts.forEachChild(node, findFirstTaggedTemplate);
  }

  function getSegmentSourcePos(
    template: tsModule.TaggedTemplateExpression,
    segment: number,
    position: number,
  ): number | undefined {
    const temp = template.template;
    if (ts.isNoSubstitutionTemplateLiteral(temp)) {
      return temp.getStart() + 1 + position;
    }
    if (segment === 0) {
      return temp.head.getStart() + 1 + position;
    }
    const spanIndex = segment - 1;
    if (spanIndex < temp.templateSpans.length) {
      return temp.templateSpans[spanIndex].literal.getStart() + position;
    }
    return undefined;
  }

  function toJsx(code: string, errors?: TransformError[]): string {
    let result = code;
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      iterations++;

      const sourceFile = ts.createSourceFile(
        "test.ts",
        result,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      const template = findFirstTaggedTemplate(sourceFile);

      if (!template) {
        break;
      }

      let strings: string[];
      let expressions: tsModule.Expression[];

      if (ts.isNoSubstitutionTemplateLiteral(template.template)) {
        strings = [template.template.text];
        expressions = [];
      } else {
        if (!template.template.templateSpans) {
          console.error('templateSpans is not iterable or undefined');
          break;
        }
        strings = [
          template.template.head.text,
          ...template.template.templateSpans.map((span) => span.literal.text),
        ];
        expressions = template.template.templateSpans.map(
          (span) => span.expression,
        );
      }

      let jsxCode: string;
      try {
        const tokens = tokenize(strings as unknown as TemplateStringsArray);
        const parsed = parse(tokens) as RootNode;
        jsxCode = printJsxFromAST(parsed, expressions, strings, result);
      } catch(e: unknown) {
        const msg = (e as Error).message;
        console.error('Error in tokenize/parse:', msg);
        if (errors) {
          let errStart = template.template.getStart() + 1;
          let errEnd = template.template.getEnd() - 1;
          const segMatch = msg.match(/segment (\d+), position (\d+)$/);
          if (segMatch) {
            const segment = parseInt(segMatch[1]);
            const position = parseInt(segMatch[2]);
            const sourcePos = getSegmentSourcePos(template, segment, position);
            if (sourcePos !== undefined) {
              errStart = sourcePos;
              errEnd = sourcePos + 1;
            }
          }
          errors.push({
            start: errStart,
            end: errEnd,
            message: msg,
          });
        }
        jsxCode = "true";
      }

      result =
        result.slice(0, template.getStart()) +
        jsxCode +
        result.slice(template.getEnd());
    }

    return result;
  }

  function toJsxWithMappings(code: string): { code: string; mappings: MappingResult; errors: TransformError[] } {
    const errors: TransformError[] = [];
    const codeResult = toJsx(code, errors);
    const mappings = computeMappings(code, codeResult);
    return { code: codeResult, mappings, errors };
  }

    function printJsxFromAST(
      parsed: RootNode,
      expressions: tsModule.Expression[],
      strings: string[],
      sourceCode: string,
    ): string {
      try {
        if (!parsed.children || parsed.children.length === 0) {
        return "<></>";
      }

    attachWhitespaceInfo(parsed, strings, expressions);

    const children = parsed.children;

    if (children.length === 0) {
      return "";
    }

    if (children.length === 1 && children[0].type === "ELEMENT") {
      return printJsxElement(children[0], expressions, strings, sourceCode);
    }

    let jsx = "";
    for (const child of children) {
      if (child.type === "TEXT") {
        jsx += child.value;
      } else if (child.type === "ELEMENT") {
        jsx += printJsxElement(child, expressions, strings, sourceCode);
      } else if (child.type === "EXPRESSION") {
        const expr = expressions[child.value as number];
        if (expr) {
          jsx += `{${expr.getText()}}`;
        }
      }
    }
    return `<>${jsx}</>`;
      } catch(e: unknown) {
        console.error('Error in printJsxFromAST:', (e as Error).message);
        throw e;
      }
    }

    function printJsxElement(
      element: any,
      expressions: tsModule.Expression[],
      strings: string[],
      sourceCode: string,
    ): string {
      let name = element.name;

    if (typeof name === "number") {
      const expr = expressions[name];
      if (!expr) {
        console.error('expression not found at index', name, 'expressions length:', expressions.length);
        return '<!-- error: expression not found -->';
      }
      name = expr.getText();
    }

      const children = element.children || [];
      const props = element.props || [];

    const isSelfClosing = element.tokens?.openTag?.slash !== undefined;

    let attrs = "";

    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      const propName = prop.name;
      const propValue = prop.value;
      const propType = prop.type;

      let whitespace = " ";
      if (i === 0) {
        whitespace = getElementWhitespaceBeforeFirstProp(element) || " ";
      } else {
        whitespace = getPropWhitespaceBefore(prop) || " ";
      }

      if (propType === "BOOLEAN") {
        attrs += `${whitespace}${propName}`;
      } else if (propType === "STRING") {
        attrs += `${whitespace}${propName}="${propValue}"`;
      } else if (propType === "EXPRESSION" && propValue !== undefined) {
        const expr = expressions[propValue as number];
        if (!expr) {
          console.error('Expression not found at index', propValue, 'expressions length:', expressions.length);
          attrs += `${whitespace}${propName}={/* error: expression not found */}`;
          continue;
        }
        let exprText = expr.getText();
        if (callbacks?.toJSX) {
          try {
            exprText = callbacks.toJSX({
              expression: expr,
              propName,
              propType: "attribute",
              templateNode: prop,
              sourceCode,
            });
          } catch (e) {
            console.error('Error in toJSX callback:', e);
            exprText = expr.getText();
          }
        }
        attrs += `${whitespace}${propName}={${exprText}}`;
      } else if (propType === "SPREAD" && propValue !== undefined) {
        const expr = expressions[propValue];
        const exprText = expr.getText();
        attrs += `${whitespace}{...${exprText}}`;
      }
    }

    if (props.length > 0) {
      const afterLast = getElementWhitespaceAfterLastProp(element) || "";
      attrs += afterLast;
    }

    let childrenStr = "";
    for (const child of children) {
      if (child.type === "ELEMENT") {
        childrenStr += printJsxElement(child, expressions, strings, sourceCode);
      } else if (child.type === "TEXT") {
        childrenStr += child.value;
      } else if (child.type === "EXPRESSION" && child.value !== undefined) {
        const expr = expressions[child.value as number];
        if (!expr) {
          console.error('Expression not found at index', child.value, 'expressions length:', expressions.length);
          childrenStr += `{/* error: expression not found */}`;
          continue;
        }
        let exprText = expr.getText();
        if (callbacks?.toJSX) {
          try {
            exprText = callbacks.toJSX({
              expression: expr,
              propType: "child",
              templateNode: child,
              sourceCode,
            });
          } catch (e) {
            console.error('Error in toJSX callback:', e);
            exprText = expr.getText();
          }
        }
        childrenStr += `{${exprText}}`;
      }
    }

    if (isSelfClosing) {
      if (attrs) {
        return `<${name}${attrs}/>`;
      } else {
        return `<${name} />`;
      }
    } else if (childrenStr) {
      return `<${name}${attrs}>${childrenStr}</${name}>`;
    } else {
      return `<${name}${attrs}></${name}>`;
    }
  }

  return { toJsx, toJsxWithMappings };
}

// Backward compatibility - default jsx transformer
import * as ts from "typescript";
export const { toJsx, toJsxWithMappings } = createJsxTransformer(["jsx"], ts);

export { computeMappings } from "./mappings";
export type { MappingResult } from "./mappings";
