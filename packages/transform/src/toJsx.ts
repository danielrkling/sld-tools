import { tokenize, parse, RootNode } from "parse-tagged-jsx";
import { computeMappings } from "./mappings";
import type { MappingResult } from "./mappings";
import type * as tsModule from "typescript";
import type { TransformerCallbacks } from "./types";

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

  function toJsx(code: string): string {
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

      let parsed: RootNode;
      try {
        const tokens = tokenize(strings as unknown as TemplateStringsArray);
        parsed = parse(tokens) as RootNode;
      } catch(e) {
        console.error('Error in tokenize/parse:', e.message);
        console.error('strings:', strings);
        console.error('strings.raw:', (strings as any).raw);
        throw e;
      }
      const jsxCode = printJsxFromAST(parsed, expressions, result);

      result =
        result.slice(0, template.getStart()) +
        jsxCode +
        result.slice(template.getEnd());
    }

    return result;
  }

  function toJsxWithMappings(code: string): { code: string; mappings: MappingResult } {
    const codeResult = toJsx(code);
    const mappings = computeMappings(code, codeResult);
    return { code: codeResult, mappings };
  }

    function printJsxFromAST(
      parsed: RootNode,
      expressions: tsModule.Expression[],
      sourceCode: string,
    ): string {
      try {
        if (!parsed.children || parsed.children.length === 0) {
      return "<></>";
    }

    const children = parsed.children;

    // Filter out whitespace-only text nodes at the beginning/end
    const meaningfulChildren = children.filter((c, idx) => {
      if (c.type === "TEXT" && c.value.trim() === "") {
        // Keep whitespace text nodes only if they're not at the beginning or end
        const isLeading = idx === 0;
        const isTrailing = idx === children.length - 1;
        return !isLeading && !isTrailing;
      }
      return true;
    });

    if (meaningfulChildren.length === 0) {
      return "";
    }

    if (meaningfulChildren.length === 1 && meaningfulChildren[0].type === "ELEMENT") {
      return printJsxElement(meaningfulChildren[0], expressions, sourceCode);
    }

    // For multiple root elements, wrap in fragment
    let jsx = "";
    for (const child of meaningfulChildren) {
      if (child.type === "TEXT") {
        jsx += child.value;
      } else if (child.type === "ELEMENT") {
        jsx += printJsxElement(child, expressions, sourceCode);
      } else if (child.type === "EXPRESSION") {
        const expr = expressions[child.value as number];
        if (expr) {
          jsx += `{${sourceCode.slice(expr.getStart(), expr.getEnd())}}`;
        }
      }
    }
    return `<>${jsx}</>`;
      } catch(e) {
        console.error('Error in printJsxFromAST:', e.message);
        throw e;
      }
    }

    function printJsxElement(
      element: any,
      expressions: tsModule.Expression[],
      sourceCode: string,
    ): string {
      let name = element.name;

    if (typeof name === "number") {
      const expr = expressions[name];
      if (!expr) {
        console.error('expression not found at index', name, 'expressions length:', expressions.length);
        return '<!-- error: expression not found -->';
      }
      name = sourceCode.slice(expr.getStart(), expr.getEnd());
    }

      const children = element.children || [];
      const props = element.props || [];

    const isSelfClosing = element.tokens?.openTag?.slash !== undefined;

    let attrs = "";
    for (const prop of props) {
      const propName = prop.name;
      const propValue = prop.value;
      const propType = prop.type;

      if (
        propType === "BOOLEAN"
      ) {
        attrs += ` ${propName}`;
      } else if (propType === "STRING") {
        attrs += ` ${propName}="${propValue}"`;
      } else if (propType === "EXPRESSION" && propValue !== undefined) {
        const expr = expressions[propValue as number];
        if (!expr) {
          console.error('Expression not found at index', propValue, 'expressions length:', expressions.length);
          attrs += ` ${propName}={/* error: expression not found */}`;
          break;
        }
        let exprText = sourceCode.slice(expr.getStart(), expr.getEnd());
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
            exprText = sourceCode.slice(expr.getStart(), expr.getEnd());
          }
        }
        attrs += ` ${propName}={${exprText}}`;
      } else if (propType === "SPREAD" && propValue !== undefined) {
        const expr = expressions[propValue];
        const exprText = sourceCode.slice(expr.getStart(), expr.getEnd());
        attrs += ` {...${exprText}}`;
      }
    }

    let childrenStr = "";
    for (const child of children) {
      if (child.type === "ELEMENT") {
        childrenStr += printJsxElement(child, expressions, sourceCode);
      } else if (child.type === "TEXT") {
        childrenStr += child.value;
      } else if (child.type === "EXPRESSION" && child.value !== undefined) {
        const expr = expressions[child.value as number];
        if (!expr) {
          console.error('Expression not found at index', child.value, 'expressions length:', expressions.length);
          childrenStr += `{/* error: expression not found */}`;
          break;
        }
        let exprText = sourceCode.slice(expr.getStart(), expr.getEnd());
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
            exprText = sourceCode.slice(expr.getStart(), expr.getEnd());
          }
        }
        childrenStr += `{${exprText}}`;
      }
    }

    if (isSelfClosing) {
      if (attrs) {
        return `<${name}${attrs} />`;
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

export { computeMappings, MappingResult } from "./mappings";