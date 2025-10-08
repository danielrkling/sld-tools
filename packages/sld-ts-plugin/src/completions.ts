import ts from "typescript/lib/tsserverlibrary";
import {
  COMPONENT_NODE,
  ELEMENT_NODE,
  getNodeAtPosition,
  getNodeInRootAtPosition,
  getRootAtPosition,
  TEXT_NODE,
} from "./parse";

export function getCompletionsAtPosition(
  ts: typeof import("typescript/lib/tsserverlibrary"),
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  position: number
): ts.CompletionInfo | undefined {
  const root = getRootAtPosition(ts, checker, sourceFile, position);
  if (!root) return;

  let entries: ts.CompletionEntry[] = [];

  const node = getNodeInRootAtPosition(root, position);
  if (!node) return;

  switch (node.type) {
    case TEXT_NODE:
      if (sourceFile.getFullText().charAt(position - 1) === "<") {
        entries.push(
          ...root.components.getProperties().map((comp) => ({
            name: comp.name,
            kind: ts.ScriptElementKind.functionElement,
            kindModifiers: "",
            sortText: "0",
            insertText: `${comp.name} $1 >$2</${comp.name}>`,
            isSnippet: true as const,
          }))
        );
        entries.push(
          ...root.elements.getProperties().map((el) => ({
            name: el.name,
            kind: ts.ScriptElementKind.classElement,
            kindModifiers: "",
            sortText: "0",
            insertText: `${el.name} $1 >$2</${el.name}>`,
            isSnippet: true as const,
          }))
        );
      }
      break;
    case ELEMENT_NODE:        
      if (sourceFile.getFullText().charAt(position) === " ") {
        const properties = node.tsType?.getProperties() || [];
        entries = properties.map((prop) => ({
          name: prop.getName(),
          kind: ts.ScriptElementKind.memberVariableElement,
          kindModifiers: "",
          sortText: "0",
        }));
      }
      break;
    case COMPONENT_NODE:
      if (sourceFile.getFullText().charAt(position) === " ") {
        const fnType = node.tsType;
        if (fnType) {
          const callSignatures = fnType.getCallSignatures();
          if (callSignatures.length) {
            const firstSig = callSignatures[0];
            const paramType =
              firstSig.getParameters()[0]?.valueDeclaration &&
              checker.getTypeOfSymbolAtLocation(
                firstSig.getParameters()[0],
                firstSig.getParameters()[0].valueDeclaration!
              );
            if (paramType) {
              const props = paramType.getProperties();
              entries = props.map((prop) => ({
                name: prop.getName(),
                kind: ts.ScriptElementKind.memberVariableElement,
                kindModifiers: "",
                sortText: "0",
              }));
            }
          }
        }
      }
      break;
  }

  return {
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries,
  };
}
