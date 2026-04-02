import * as ts from "typescript/lib/tsserverlibrary";

export interface JsxTemplateNode {
  node: ts.TaggedTemplateExpression;
  strings: string[];
  templateSpanExpressions: ts.Expression[];
  start: number;
  end: number;
}

export function getJsxTemplateNodes(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): JsxTemplateNode[] {
  const nodes: JsxTemplateNode[] = [];

  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isTaggedTemplateExpression(node)) {
      const tagName = node.tag.getText(sourceFile);
      if (tagName === "jsx") {
        const { strings, templateSpanExpressions } = getTemplateStringsArray(
          ts,
          sourceFile,
          node.template
        );

        nodes.push({
          node,
          strings,
          templateSpanExpressions,
          start: node.getStart(sourceFile),
          end: node.getEnd(),
        });
      }
    }
    ts.forEachChild(node, visit);
  });

  return nodes;
}

export function getJsxTemplateAtPosition(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  position: number
): JsxTemplateNode | undefined {
  const nodes = getJsxTemplateNodes(ts, sourceFile);
  return nodes.find((node) => {
    if (position >= node.start && position <= node.end) {
      return true;
    }
    return false;
  });
}

export function getTemplateStringsArray(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  template: ts.TemplateLiteral
): { strings: string[]; templateSpanExpressions: ts.Expression[] } {
  const strings: string[] = [];
  const templateSpanExpressions: ts.Expression[] = [];

  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    strings.push(template.text);
  } else if (ts.isTemplateExpression(template)) {
    strings.push(template.head.text);
    for (const span of template.templateSpans) {
      templateSpanExpressions.push(span.expression);
      strings.push(span.literal.text);
    }
  }

  return { strings, templateSpanExpressions };
}
