import * as ts from "typescript";
import {
  parse,
  tokenize,
  RootNode,
  ElementNode,
  TextNode,
  ExpressionNode,
  ChildNode,
  PropNode,
  ELEMENT_NODE,
  TEXT_NODE,
  EXPRESSION_NODE,
  BOOLEAN_PROP,
  STRING_PROP,
  EXPRESSION_PROP,
  SPREAD_PROP,
} from "parse-jsx";

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

interface Replacement {
  start: number;
  end: number;
  newText: string;
}

export function sldToJsx(text: string, options?: { tags?: string[] }): string {
  const tags = options?.tags ?? ["jsx", "sld"];
  
  const sourceFile = ts.createSourceFile(
    "test.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const replacements: Replacement[] = [];

  function visit(node: ts.Node): void {
    if (ts.isTaggedTemplateExpression(node)) {
      const tagName = node.tag.getText(sourceFile);
      if (tags.some(t => t.toLowerCase() === tagName.toLowerCase())) {
        const jsx = transformTemplate(node.template, sourceFile);
        replacements.push({
          start: node.getStart(sourceFile),
          end: node.getEnd(),
          newText: jsx,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return applyReplacements(text, replacements);
}

function transformTemplate(
  template: ts.TemplateLiteral,
  sourceFile: ts.SourceFile
): string {
  const { strings, expressions } = extractTemplateData(template, sourceFile);
  const tokens = tokenize(strings);
  const ast = parse(tokens);
  return renderAstToJsx(ast, expressions);
}

function extractTemplateData(
  template: ts.TemplateLiteral,
  sourceFile: ts.SourceFile
): { strings: string[]; expressions: string[] } {
  const strings: string[] = [];
  const expressions: string[] = [];

  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    strings.push(template.text);
  } else {
    strings.push(template.head.text);
    for (const span of template.templateSpans) {
      expressions.push(span.expression.getText(sourceFile));
      strings.push(span.literal.text);
    }
  }

  return { strings, expressions };
}

function renderAstToJsx(ast: RootNode, expressions: string[]): string {
  const parts = ast.children.map((child) => renderChild(child, expressions));
  const jsx = parts.join("");

  const rootElements = countRootElements(ast);
  return rootElements > 1 ? `<>${jsx}</>` : jsx;
}

function renderChild(node: ChildNode, expressions: string[]): string {
  if (node.type === TEXT_NODE) {
    return (node as TextNode).value;
  }

  if (node.type === EXPRESSION_NODE) {
    const exprNode = node as ExpressionNode;
    const expr = unwrapArrowExpression(expressions[exprNode.value]);
    return `{${expr}}`;
  }

  if (node.type === ELEMENT_NODE) {
    return renderElement(node as ElementNode, expressions);
  }

  return "";
}

function renderElement(node: ElementNode, expressions: string[]): string {
  const tagName = String(node.name);
  const props = node.props.map((p) => renderProp(p, expressions)).join("");
  const children = node.children
    .map((c) => renderChild(c, expressions))
    .join("");

  if (node.slash || VOID_ELEMENTS.has(tagName)) {
    return `<${tagName}${props} />`;
  }

  return `<${tagName}${props}>${children}</${tagName}>`;
}

function renderProp(prop: PropNode, expressions: string[]): string {
  if (prop.type === BOOLEAN_PROP) {
    return ` ${prop.name}`;
  }

  if (prop.type === STRING_PROP) {
    return ` ${prop.name}="${prop.value}"`;
  }

  if (prop.type === EXPRESSION_PROP) {
    const expr = unwrapArrowExpression(expressions[prop.value]);
    if (prop.name === "...") {
      return ` {...${expr}}`;
    }
    return ` ${prop.name}={${expr}}`;
  }

  return "";
}

function countRootElements(ast: RootNode): number {
  return ast.children.filter((c) => c.type === ELEMENT_NODE).length;
}

function unwrapArrowExpression(exprText: string): string {
  const trimmed = exprText.trim();
  const arrowMatch = trimmed.match(/^\(\s*\)\s*=>\s*(.+)$/s);
  if (arrowMatch) {
    return arrowMatch[1].trim();
  }
  return exprText;
}

function applyReplacements(text: string, replacements: Replacement[]): string {
  replacements.sort((a, b) => b.start - a.start);
  let result = text;
  for (const replacement of replacements) {
    result =
      result.slice(0, replacement.start) +
      replacement.newText +
      result.slice(replacement.end);
  }
  return result;
}
