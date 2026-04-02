import * as ts from "typescript/lib/tsserverlibrary";
import { ParseJSXError } from "parse-jsx";
import { getJsxTemplateNodes, getJsxTemplateAtPosition, JsxTemplateNode } from "./finder";
import { parseJsxTemplate } from "./parser";
import { toJsxWithMappings, getJsxPosition } from "transform-jsx";

export interface PluginConfig {
  jsxImportSource?: string;
  tags?: string[];
}

export function getSemanticDiagnostics(
  ts: typeof import("typescript"),
  program: ts.Program,
  fileName: string,
  config?: PluginConfig
): ts.Diagnostic[] {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return [];

  const diagnostics: ts.Diagnostic[] = [];
  const templateNodes = getJsxTemplateNodes(ts, sourceFile);

  for (const templateNode of templateNodes) {
    try {
      parseJsxTemplate(ts, sourceFile, templateNode);
    } catch (error) {
      if (error instanceof ParseJSXError) {
        const diagnostic = createDiagnosticFromError(
          ts,
          sourceFile,
          templateNode,
          error
        );
        if (diagnostic) {
          diagnostics.push(diagnostic);
        }
      }
    }
  }

  return diagnostics;
}

function createDiagnosticFromError(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  templateNode: JsxTemplateNode,
  error: ParseJSXError
): ts.Diagnostic | undefined {
  const templateStart = templateNode.node.getStart(sourceFile) + 1;

  let absolutePosition = templateStart;

  if (error.message.includes("segment") && error.message.includes("position")) {
    const match = error.message.match(/segment (\d+), position (\d+)/);
    if (match) {
      const segmentIndex = parseInt(match[1], 10);
      const segmentPosition = parseInt(match[2], 10);

      for (let i = 0; i < segmentIndex; i++) {
        absolutePosition += templateNode.strings[i].length;
      }
      absolutePosition += segmentPosition;
    }
  }

  const errorMessage = error.message.replace(/segment \d+, position \d+/, "").trim();

  return {
    file: sourceFile,
    start: absolutePosition,
    length: 1,
    messageText: errorMessage,
    category: ts.DiagnosticCategory.Error,
    code: 9001,
    source: "ts-plugin-jsx",
  };
}

export function getCompletionsAtPosition(
  ts: typeof import("typescript"),
  program: ts.Program,
  fileName: string,
  position: number
): ts.CompletionInfo | undefined {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return;

  const templateNodes = getJsxTemplateNodes(ts, sourceFile);
  
  for (const templateNode of templateNodes) {
    if (position < templateNode.start || position > templateNode.end) {
      continue;
    }

    const templateStart = templateNode.node.getStart(sourceFile) + 1;
    const adjustedPosition = position - templateStart;

    const charBefore = sourceFile.getFullText().charAt(position - 1);
    const charAt = sourceFile.getFullText().charAt(position);

    if (charBefore === "<" || (charBefore === "" && charAt === "<")) {
      return createElementCompletions();
    }

    if (charBefore === " " || charBefore === ">") {
      return createAttributeCompletions();
    }
  }
}

function createElementCompletions(): ts.CompletionInfo {
  const elements = [
    "div", "span", "p", "a", "button", "input", "textarea", "select",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table",
    "tr", "td", "th", "thead", "tbody", "form", "label", "img",
    "br", "hr", "strong", "em", "code", "pre", "blockquote", "article",
    "section", "header", "footer", "nav", "main", "aside", "figure",
    "figcaption", "audio", "video", "source", "canvas", "svg", "iframe"
  ];

  return {
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries: elements.map((name) => ({
      name,
      kind: ts.ScriptElementKind.classElement,
      sortText: "0",
    })),
  };
}

function createAttributeCompletions(): ts.CompletionInfo {
  const attributes = [
    "class", "className", "id", "style", "onClick", "onInput", "onChange",
    "src", "alt", "href", "target", "rel", "type", "value", "placeholder",
    "disabled", "readonly", "required", "checked", "selected", "multiple",
    "name", "for", "action", "method", "enctype", "autocomplete",
    "title", "tabIndex", "accessKey", "contentEditable", "draggable",
    "aria-label", "aria-describedby", "aria-hidden", "role"
  ];

  return {
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries: attributes.map((name) => ({
      name,
      kind: ts.ScriptElementKind.memberVariableElement,
      sortText: "0",
    })),
  };
}

export function getQuickInfoAtPosition(
  ts: typeof import("typescript"),
  program: ts.Program,
  fileName: string,
  position: number
): ts.QuickInfo | undefined {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return undefined;

  const templateNode = getJsxTemplateAtPosition(ts, sourceFile, position);
  if (!templateNode) return undefined;

  const fullText = sourceFile.getFullText();
  const { code: jsxCode, mappings } = toJsxWithMappings(fullText);
  const jsxPosition = getJsxPosition(position, mappings.mappings, jsxCode.length);
  
  if (jsxPosition === undefined) return undefined;

  const jsxSourceFile = ts.createSourceFile(
    fileName,
    jsxCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const jsxProgram = ts.createProgram(
    [fileName],
    program.getCompilerOptions(),
    {
      getSourceFile: (name) => name === fileName ? jsxSourceFile : undefined,
      getDefaultLibFileName: () => "lib.d.ts",
      writeFile: () => {},
      getCurrentDirectory: () => "",
      getDirectories: () => [],
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      fileExists: (f) => f === fileName,
      readFile: () => "",
    }
  );

  const checker = jsxProgram.getTypeChecker();
  
  let targetNode: ts.Node | undefined;
  function findNode(node: ts.Node) {
    const start = node.getStart(jsxSourceFile);
    const end = node.getEnd();
    if (start !== undefined && end !== undefined && jsxPosition! >= start && jsxPosition! <= end) {
      targetNode = node;
    }
    ts.forEachChild(node, findNode);
  }
  jsxSourceFile.forEachChild(findNode);

  if (!targetNode) return undefined;

  const type = checker.getTypeAtLocation(targetNode);
  if (!type) return undefined;

  const symbol = type.symbol || type.aliasSymbol;
  if (!symbol) return undefined;

  const name = symbol.getName();
  const nameStart = targetNode.getStart(jsxSourceFile);
  const nameEnd = targetNode.getEnd();

  return {
    kind: ts.ScriptElementKind.unknown,
    kindModifiers: "",
    textSpan: {
      start: position,
      length: nameEnd - nameStart,
    },
    displayParts: [{ text: name, kind: ts.SymbolDisplayPartKind.stringLiteral as any }],
    documentation: [],
    tags: [],
  };
}

export function getDefinitionAndBoundSpan(
  ts: typeof import("typescript"),
  program: ts.Program,
  fileName: string,
  position: number
): ts.DefinitionInfoAndBoundSpan | undefined {
  return undefined;
}