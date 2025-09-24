import type * as ts from "typescript/lib/tsserverlibrary";
import { getSLDTemplatesNodes } from "./parse";

export function getFormattingEditsForDocument(
  tsApi: typeof ts,
  sourceFile: ts.SourceFile
): ts.TextChange[] {
  const changes: ts.TextChange[] = [];

  const templates = getSLDTemplatesNodes(tsApi, sourceFile);

  templates.forEach((node) => {
    const template = node.template;

    if (tsApi.isNoSubstitutionTemplateLiteral(template)) {
      // No substitutions, just text
      const rawText = template.text;
      const trimmed = rawText.trim();


      if (trimmed !== rawText) {
        changes.push({
          span: { start: template.getStart() + 1, length: rawText.length }, // +1 to skip the opening backtick `
          newText: trimmed,
        });
      }
    }
  });

  return changes;
}
