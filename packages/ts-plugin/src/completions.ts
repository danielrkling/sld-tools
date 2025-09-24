import  ts from "typescript/lib/tsserverlibrary";
import { getSLDTemplatesNodes, getTemplateNodeAtPosition, getTokenAtPosition } from "./parse";
import { TokenKind } from "html5parser";

export function getCompletionsAtPosition(
  ts: typeof import("typescript/lib/tsserverlibrary"),
  sourceFile: ts.SourceFile,
  position: number
): ts.CompletionInfo | undefined {
  const token = getTokenAtPosition(ts, sourceFile, position);
  if (!token) return;

  let entries: ts.CompletionEntry[] = [];

  switch (token.type) {
    case TokenKind.OpenTag:
      entries = [
        { name: "div", kind: ts.ScriptElementKind.keyword, kindModifiers: "", sortText: "0" },
        { name: "span", kind: ts.ScriptElementKind.keyword, kindModifiers: "", sortText: "0" },
        { name: "button", kind: ts.ScriptElementKind.keyword, kindModifiers: "", sortText: "0" },
      ];
      break;

    case TokenKind.AttrValueEq:
    case TokenKind.AttrValueNq:
    case TokenKind.AttrValueSq:
    case TokenKind.AttrValueDq:
      entries = [
        { name: "true", kind: ts.ScriptElementKind.keyword, kindModifiers: "", sortText: "0" },
        { name: "false", kind: ts.ScriptElementKind.keyword, kindModifiers: "", sortText: "0" },
        { name: "auto", kind: ts.ScriptElementKind.keyword, kindModifiers: "", sortText: "0" },
      ];
      break;

    case TokenKind.Whitespace:
      entries = [
        { name: "class", kind: ts.ScriptElementKind.memberVariableElement, kindModifiers: "", sortText: "0" },
        { name: "id", kind: ts.ScriptElementKind.memberVariableElement, kindModifiers: "", sortText: "0" },
        { name: "style", kind: ts.ScriptElementKind.memberVariableElement, kindModifiers: "", sortText: "0" },
      ];
      break;

    case TokenKind.CloseTag:
      // Possibly suggest closing tags based on context
      entries = [
        { name: "div", kind: ts.ScriptElementKind.keyword, kindModifiers: "", sortText: "0" },
        { name: "span", kind: ts.ScriptElementKind.keyword, kindModifiers: "", sortText: "0" },
      ];
      break;

    case TokenKind.Literal:
      // Generic suggestions
      entries = [
        { name: "Hello", kind: ts.ScriptElementKind.string, kindModifiers: "", sortText: "0" },
        { name: "World", kind: ts.ScriptElementKind.string, kindModifiers: "", sortText: "0" },
      ];
      break;

    default:
      // No completions for other token types
      return;
  }

  return {
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries,
  };
}
