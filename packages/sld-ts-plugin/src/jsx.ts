import * as ts from "typescript/lib/tsserverlibrary";
import { sldToJsx as transformSldToJsx, jsxToSld as transformJsxToSld } from "transform-jsx";
import { getSLDTemplatesNodes } from "./parse";

export function sldToJsx(
  ts: typeof import("typescript"),
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  node: ts.TaggedTemplateExpression,
  options?: { tags?: string[] }
): string {
  const tagName = node.tag.getText(sourceFile);
  const text = sourceFile.getFullText();
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  const taggedTemplate = text.slice(start, end);
  
  const tags = options?.tags ?? [tagName];
  const result = transformSldToJsx(taggedTemplate, { tags });
  
  return result;
}

export function jsxToSld(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  options?: { tag?: string }
): string {
  const text = sourceFile.getFullText();
  const tag = options?.tag ?? "jsx";
  
  const result = transformJsxToSld(text, { tag });
  
  return result;
}

export function sourceFileToJsx(
  ts: typeof import("typescript"),
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  options?: { tags?: string[] }
): string {
  const nodes = getSLDTemplatesNodes(ts, sourceFile);
  if (nodes.length === 0) {
    return "";
  }
  return nodes
    .map((node) => sldToJsx(ts, checker, sourceFile, node, options))
    .join("\n");
}
