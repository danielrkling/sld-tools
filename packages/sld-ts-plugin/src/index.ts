import type * as ts from "typescript/lib/tsserverlibrary";
import { getFormattingEditsForDocument } from "./formatting";
import { getCompletionsAtPosition } from "./completions";
import { getSemanticDiagnostics } from "./diagnostics";
import { getQuickInfoAtPosition } from "./quickInfo";
import { sldToJsx, jsxToSld } from "./jsx";
import { getSLDTemplatesNodes } from "./parse";

function init(modules: { typescript: typeof ts }) {
  const ts = modules.typescript;

  function create(
    info: ts.server.PluginCreateInfo
  ): Partial<ts.LanguageService> {
    return {
      ...info.languageService,
      getCompletionsAtPosition(
        fileName,
        position,
        options,
        formattingSettings
      ) {
        const program = info.languageService.getProgram();
        if (!program) return;
        const checker = program.getTypeChecker();
        if (!checker) return;
        const sourceFile = program.getSourceFile(fileName);
        if (!sourceFile) return;
        return (
          getCompletionsAtPosition(ts, checker, sourceFile, position) ??
          info.languageService.getCompletionsAtPosition(
            fileName,
            position,
            options,
            formattingSettings
          )
        );
      },



      getQuickInfoAtPosition(fileName, position, maximumLength) {
        const program = info.languageService.getProgram();
        if (!program)
          return info.languageService.getQuickInfoAtPosition(
            fileName,
            position
          );
        return (
          getQuickInfoAtPosition(ts, program, fileName, position) ??
          info.languageService.getQuickInfoAtPosition(fileName, position)
        );
      },

      getSemanticDiagnostics(fileName) {
        const program = info.languageService.getProgram();
        if (!program) return [];
        
        const sourceFile = program.getSourceFile(fileName);
        if (!sourceFile) return [];
        
        const checker = program.getTypeChecker();
        
        const sldNodes = getSLDTemplatesNodes(ts, sourceFile);
        const diagnostics: ts.Diagnostic[] = [];
        
        for (const node of sldNodes) {
          diagnostics.push({
            file: sourceFile,
            start: node.getStart(sourceFile),
            length: node.getEnd() - node.getStart(sourceFile),
            messageText: "SLD template - press Ctrl+. to convert to JSX",
            category: ts.DiagnosticCategory.Message,
            code: 1999,
            source: "sld-ts-plugin"
          });
        }
        
        return [...diagnostics, ...getSemanticDiagnostics(ts, program, fileName)];
      },

      getCodeFixesAtPosition(
        fileName: string,
        start: number,
        end: number,
        errorCodes: number[],
        formatOptions: ts.FormatCodeSettings,
        preferences: ts.UserPreferences = {}
      ): readonly ts.CodeFixAction[] {
        const program = info.languageService.getProgram();
        if (!program) return [];
        
        const sourceFile = program.getSourceFile(fileName);
        if (!sourceFile) return [];
        
        const checker = program.getTypeChecker();
        if (!checker) return [];

        const fixActions: ts.CodeFixAction[] = [];
        
        const cursorPos = start;

        const sldNodes = getSLDTemplatesNodes(ts, sourceFile);
        for (const node of sldNodes) {
          const nodeStart = node.getStart(sourceFile);
          const nodeEnd = node.getEnd();
          
          if (cursorPos >= nodeStart && cursorPos <= nodeEnd) {
            const jsxCode = sldToJsx(ts, checker, sourceFile, node);
            fixActions.push({
              fixName: "sld-to-jsx",
              description: "Convert SLD to JSX",
              changes: [{
                fileName,
                textChanges: [{
                  span: { start: nodeStart, length: nodeEnd - nodeStart },
                  newText: jsxCode
                }]
              }]
            });
            break;
          }
        }

        const jsxElements = findJsxElements(ts, sourceFile);
        for (const elem of jsxElements) {
          const elemStart = elem.getStart(sourceFile);
          const elemEnd = elem.getEnd();
          
          if (cursorPos >= elemStart && cursorPos <= elemEnd) {
            const sldCode = jsxToSld(ts, sourceFile);
            if (sldCode) {
              fixActions.push({
                fixName: "jsx-to-sld",
                description: "Convert JSX to SLD",
                changes: [{
                  fileName,
                  textChanges: [{
                    span: { start: elemStart, length: elemEnd - elemStart },
                    newText: sldCode
                  }]
                }]
              });
            }
            break;
          }
        }

        return fixActions;
      },
    };
  }

  return { create };
}

function findJsxElements(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile
): (ts.JsxElement | ts.JsxSelfClosingElement)[] {
  const elements: (ts.JsxElement | ts.JsxSelfClosingElement)[] = [];
  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      elements.push(node);
    }
    ts.forEachChild(node, visit);
  });
  return elements;
}

function renderJsxElementToSld(
  ts: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  node: ts.JsxElement | ts.JsxSelfClosingElement
): string {
  return jsxToSld(ts, sourceFile);
}

export = init;
