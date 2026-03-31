import * as ts from "typescript";
import { tokenize, parse, RootNode } from "parse-jsx";

export function toJsx(code: string): string {
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
    let expressions: ts.Expression[];

    if (ts.isNoSubstitutionTemplateLiteral(template.template)) {
      strings = [template.template.text];
      expressions = [];
    } else {
      strings = [
        template.template.head.text,
        ...template.template.templateSpans.map((span) => span.literal.text),
      ];
      expressions = template.template.templateSpans.map(
        (span) => span.expression,
      );
    }

    const tokens = tokenize(strings as unknown as TemplateStringsArray);
    const parsed = parse(tokens) as RootNode;
    const jsxCode = printJsxFromAST(parsed, expressions, result);
    result =
      result.slice(0, template.getStart()) +
      jsxCode +
      result.slice(template.getEnd());
  }

  return result;
}

function findFirstTaggedTemplate(
  node: ts.Node,
): ts.TaggedTemplateExpression | undefined {
  if (ts.isTaggedTemplateExpression(node)) {
    const tag = node.tag;
    if (ts.isIdentifier(tag) && tag.text === "jsx") {
      return node;
    }
  }

  return ts.forEachChild(node, findFirstTaggedTemplate);
}

function printJsxFromAST(
  parsed: RootNode,
  expressions: ts.Expression[],
  sourceCode: string,
): string {
  if (!parsed.children || parsed.children.length === 0) {
    return "";
  }

  const children = parsed.children;

  if (children.length === 1) {
    return printJsxElement(children[0], expressions, sourceCode);
  }

  let jsx = "";
  for (const child of children) {
    jsx += printJsxElement(child, expressions, sourceCode);
  }

  return `<>${jsx}</>`;
}

function printJsxElement(
  element: any,
  expressions: ts.Expression[],
  sourceCode: string,
): string {
  let name = element.name;

  if (typeof name === "number") {
    const expr = expressions[name];
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
      propType === "BOOLEAN" ||
      (propType === undefined && propValue === true)
    ) {
      attrs += ` ${propName}`;
    } else if (propType === "STRING") {
      attrs += ` ${propName}="${propValue}"`;
    } else if (propType === "EXPRESSION" && propValue !== undefined) {
      const expr = expressions[propValue];
      const exprText = sourceCode.slice(expr.getStart(), expr.getEnd());
      attrs += ` ${propName}={${exprText}}`;
    }
  }

  let childrenStr = "";
  for (const child of children) {
    if (child.type === "ELEMENT") {
      childrenStr += printJsxElement(child, expressions, sourceCode);
    } else if (child.type === "TEXT") {
      childrenStr += child.value || "";
    } else if (child.type === "EXPRESSION" && child.value !== undefined) {
      const expr = expressions[child.value];
      const exprText = sourceCode.slice(expr.getStart(), expr.getEnd());
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
