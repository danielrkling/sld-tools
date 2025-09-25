import ts from "typescript/lib/tsserverlibrary";
import {
  ChildNode,
  COMPONENT_NODE,
  ELEMENT_NODE,
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

  const template = getTemplateNodeAtPosition(ts, sourceFile, position);
  if (!template) return;
  const nodes = parseTemplate(ts, sourceFile, template.template);

  const sym = checker.getSymbolAtLocation(template.tag)!;
  const tagType = checker.getTypeOfSymbolAtLocation(sym, template);
  const components = checker.getTypeOfSymbolAtLocation(
    tagType.getProperty("components")!,
    template
  );

  return nodes.children.map(getQuickInfo).find(Boolean);

  function getQuickInfo(node: ChildNode) {
    if (node.type === COMPONENT_NODE || node.type === ELEMENT_NODE) {
      node.children.map(getQuickInfo).find(Boolean);
      if (node.node.open.start <= position && position <= node.node.open.end) {
        if (node.type === COMPONENT_NODE) {
          return {
            kind: ts.ScriptElementKind.classElement,
            kindModifiers: "",
            textSpan: {
              start: node.node.open.start + 1,
              length: node.name.length,
            },
            displayParts: [
              { text: node.name, kind: ts.ScriptElementKind.functionElement },
              { text: ": ", kind: "punctuation" },
              {
                text: checker.typeToString(
                  checker.getTypeOfSymbol(components.getProperty(node.name)!)
                ),
                kind: "text",
              },
            ],
            documentation: [],
          };
        } else {
          return {
            kind: ts.ScriptElementKind.classElement,
            kindModifiers: "",
            textSpan: { start: node.node.start+1, length: node.name.length },
            displayParts: [
              { text: `HTML Element: <${node.name}>`, kind: "text" },
            ],
            documentation: [
              {
                text: `This is an html element`,
                kind: "text",
              },
            ],
          };
        }
      }
    }
  }
}
