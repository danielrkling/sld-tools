import ts from "typescript/lib/tsserverlibrary";
import {
  ChildNode,
  COMPONENT_NODE,
  ELEMENT_NODE,
  getInfoAtPosition,
  getSLDTemplatesNodes,
  getTemplateNodeAtPosition,
  getTokenAtPosition,
  parseTemplate,
} from "./parse";
import { TokenKind } from "html5parser";

export function getQuickInfoAtPosition(
  ts: typeof import("typescript/lib/tsserverlibrary"),
  program: ts.Program,
  fileName: string,
  position: number
) {
  const checker = program.getTypeChecker();
  const sourceFile = program?.getSourceFile(fileName);
  if (!sourceFile) return;

  const info = getInfoAtPosition(ts, checker, sourceFile, position);

  if (!info) return;

  if (info.node.type === COMPONENT_NODE) {
    if (info.part === "tag") {
      return {
        kind: ts.ScriptElementKind.classElement,
        kindModifiers: "",
        textSpan: {
          start: info.node.node.open.start + 1,
          length: info.node.name.length,
        },
        displayParts: [{ text: checker.typeToString(info.type), kind: "text" }],
      };
    } else if (info.part === "prop") {
      return {
        kind: ts.ScriptElementKind.classElement,
        kindModifiers: "",
        textSpan: {
          start: info.prop?.attr.start + 1,
          length: info.prop?.name.length,
        },
        displayParts: [{ text: checker.typeToString(info.type), kind: "text" }],
      };
    }
  }
}
