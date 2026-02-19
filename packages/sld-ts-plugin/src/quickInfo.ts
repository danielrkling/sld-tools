import ts from "typescript/lib/tsserverlibrary";
import {
  ChildNode,
  COMPONENT_NODE,
  ELEMENT_NODE,
  getNodeAtPosition,
  getSLDTemplatesNodes,
  getTemplateNodeAtPosition,
} from "./parse";

export function getQuickInfoAtPosition(
  ts: typeof import("typescript/lib/tsserverlibrary"),
  program: ts.Program,
  fileName: string,
  position: number
) {
  const checker = program.getTypeChecker();
  const sourceFile = program?.getSourceFile(fileName);
  if (!sourceFile) return;

  const templateNode = getTemplateNodeAtPosition(ts, sourceFile, position);
  if (!templateNode) return;

  const info = getNodeAtPosition(ts, checker, sourceFile, position);

  if (!info || !("type" in info)) return;
  const node = info as ChildNode;

  if (node.type === COMPONENT_NODE) {
    return {
      kind: ts.ScriptElementKind.classElement,
      kindModifiers: "",
      textSpan: {
        start: node.open.start + 1,
        length: node.name.length,
      },
      displayParts: [{ text: "Component", kind: "text" }],
    };
  } else if (node.type === ELEMENT_NODE) {
    return {
      kind: ts.ScriptElementKind.jsxAttribute,
      kindModifiers: "",
      textSpan: {
        start: node.open.start + 1,
        length: node.name.length,
      },
      displayParts: [{ text: "HTML Element", kind: "text" }],
    };
  }
}
