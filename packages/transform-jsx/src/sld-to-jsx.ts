import * as ts from "typescript";
import {
  parse,
  tokenize,
  RootNode,
  ElementNode,
  TextNode,
  ExpressionNode,
  CommentNode,
  ChildNode,
  PropNode,
  ELEMENT_NODE,
  TEXT_NODE,
  EXPRESSION_NODE,
  COMMENT_NODE,
  BOOLEAN_PROP,
  STRING_PROP,
  EXPRESSION_PROP,
  SPREAD_PROP,
} from "parse-jsx";

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

interface TemplateInfo {
  node: ts.TaggedTemplateExpression;
  start: number;
  end: number;
  tag: string;
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

  const templates = findAllTaggedTemplates(sourceFile, tags);

  if (templates.length === 0) {
    return text;
  }

  const replacements: { start: number; end: number; newText: string }[] = [];

  for (const tmpl of templates) {
    try {
      const jsx = transformTemplate(tmpl.node, sourceFile);
      replacements.push({
        start: tmpl.start,
        end: tmpl.end,
        newText: jsx,
      });
    } catch (e) {
      console.warn(`Failed to transform template:`, e);
    }
  }

  replacements.sort((a, b) => b.start - a.start);
  
  let result = text;
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.newText + result.slice(r.end);
  }

  return result;
}

function findAllTaggedTemplates(
  sourceFile: ts.SourceFile,
  tags: string[]
): TemplateInfo[] {
  const templates: TemplateInfo[] = [];

  function visit(node: ts.Node): void {
    if (ts.isTaggedTemplateExpression(node)) {
      const tagName = node.tag.getText(sourceFile);
      if (tags.some(t => t.toLowerCase() === tagName.toLowerCase())) {
        templates.push({
          node,
          start: node.getStart(sourceFile),
          end: node.getEnd(),
          tag: tagName,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  templates.sort((a, b) => a.start - b.start);

  return templates;
}

function transformTemplate(
  node: ts.TaggedTemplateExpression,
  sourceFile: ts.SourceFile
): string {
  const template = node.template;
  const { templateParts, expressions } = extractTemplateData(template, sourceFile);
  
  const processedExpressions = expressions.map(exprText => {
    return transformExpression(exprText, sourceFile);
  });
  
  const tokens = tokenize(templateParts);
  const ast = parse(tokens);
  return renderAstToJsx(ast, processedExpressions);
}

function transformExpression(
  exprText: string,
  sourceFile: ts.SourceFile
): string {
  const exprSourceFile = ts.createSourceFile(
    "expr.ts",
    exprText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  
  const innerTemplates = findAllTaggedTemplates(exprSourceFile, ["jsx", "sld"]);
  
  if (innerTemplates.length === 0) {
    return exprText;
  }
  
  innerTemplates.sort((a, b) => b.start - a.start);
  
  let result = exprText;
  
  for (const tmpl of innerTemplates) {
    const nodeStart = tmpl.start;
    const nodeEnd = tmpl.end;
    
    try {
      const jsx = transformTemplate(tmpl.node, exprSourceFile);
      const marker = `\${__JSX_TRANSFORMED__${jsx}__JSX_TRANSFORMED__}`;
      result = result.slice(0, nodeStart) + marker + result.slice(nodeEnd);
    } catch (e) {
      console.log("Transform error:", e);
    }
  }
  
  return result;
}

function extractTemplateData(
  template: ts.TemplateLiteral,
  sourceFile: ts.SourceFile
): { templateParts: string[]; expressions: string[] } {
  const expressions: string[] = [];
  const templateParts: string[] = [];

  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    return { templateParts: [template.text], expressions };
  }

  templateParts.push(template.head.text);
  for (const span of template.templateSpans) {
    const exprText = span.expression.getText(sourceFile);
    expressions.push(exprText);
    templateParts.push(span.literal.text);
  }

  return { templateParts, expressions };
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
    let expr = unwrapArrowExpression(expressions[exprNode.value]);
    
    if (expr.includes("__JSX_TRANSFORMED__")) {
      const jsxMatch = expr.match(/\$\{__JSX_TRANSFORMED__(.+?)__JSX_TRANSFORMED__\}/);
      if (jsxMatch) {
        return jsxMatch[1];
      }
      return expr;
    }
    
    if (containsJsxContent(expr)) {
      return expr;
    }
    return `{${expr}}`;
  }

  if (node.type === COMMENT_NODE) {
    const commentNode = node as CommentNode;
    const children = commentNode.children || [];
    const value = children.map((c: ChildNode) => c.type === TEXT_NODE ? (c as TextNode).value : `{${(c as ExpressionNode).value}}`).join("");
    return `<!--${value}-->`;
  }

  if (node.type === ELEMENT_NODE) {
    return renderElement(node as ElementNode, expressions);
  }

  return "";
}

function containsJsxContent(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return true;
  }
  if (trimmed.includes("<") && trimmed.includes(">")) {
    let angleBracketCount = 0;
    let braceDepth = 0;
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (char === "<" && braceDepth === 0) {
        angleBracketCount++;
      } else if (char === ">" && braceDepth === 0) {
        angleBracketCount--;
      } else if (char === "{") {
        braceDepth++;
      } else if (char === "}") {
        braceDepth--;
      }
    }
    return angleBracketCount > 0;
  }
  return false;
}

function renderElement(node: ElementNode, expressions: string[]): string {
  let tagName: string;
  
  const name = node.name;
  if (typeof name === "number") {
    const expr = unwrapArrowExpression(expressions[name]);
    tagName = expr;
  } else {
    tagName = String(name);
  }
  
  const props = node.props.map((p) => renderProp(p, expressions)).join("");
  const children = node.children
    .map((c) => renderChild(c, expressions))
    .join("");

  const hasSlash = node.tokens.openTag.slash;
  if (hasSlash || VOID_ELEMENTS.has(String(node.name))) {
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
    let expr = unwrapArrowExpression(expressions[prop.value]);
    
    if (expr.includes("__JSX_TRANSFORMED__")) {
      const jsxMatch = expr.match(/\$\{__JSX_TRANSFORMED__(.+?)__JSX_TRANSFORMED__\}/);
      if (jsxMatch) {
        expr = jsxMatch[1];
      }
    }
    
    if (prop.name === "...") {
      return ` {...${expr}}`;
    }
    return ` ${prop.name}={${expr}}`;
  }

  if (prop.type === SPREAD_PROP) {
    let expr = unwrapArrowExpression(expressions[prop.value]);
    
    if (expr.includes("__JSX_TRANSFORMED__")) {
      const jsxMatch = expr.match(/\$\{__JSX_TRANSFORMED__(.+?)__JSX_TRANSFORMED__\}/);
      if (jsxMatch) {
        expr = jsxMatch[1];
      }
    }
    
    return ` {...${expr}}`;
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
