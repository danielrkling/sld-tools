import type * as ts from "typescript/lib/tsserverlibrary";
import { getSLDTemplatesNodes } from "./parse";
import { getFormattingEditsForDocument } from "./formatting";
import { getCompletionsAtPosition } from "./completions";
import { getSemanticDiagnostics } from "./diagnostics";
import { getQuickInfoAtPosition } from "./quickInfo";

function init(modules: { typescript: typeof ts }) {
  const ts = modules.typescript;


  function create(
    info: ts.server.PluginCreateInfo
  ): Partial<ts.LanguageService> {
    return {
      ...info.languageService,
      // getCompletionsAtPosition(
      //   fileName,
      //   position,
      //   options,
      //   formattingSettings
      // ) {
      //   const sourceFile = info.languageService
      //     .getProgram()
      //     ?.getSourceFile(fileName);
      //   if (!sourceFile) return;
      //   return getCompletionsAtPosition(ts, sourceFile, position);
      // },

      getQuickInfoAtPosition(fileName, position, maximumLength) {
        const program = info.languageService.getProgram();
        if (!program) return info.languageService.getQuickInfoAtPosition(fileName, position)
        return getQuickInfoAtPosition(ts,program,fileName,position) ?? info.languageService.getQuickInfoAtPosition(fileName, position)
      },

      getSemanticDiagnostics(fileName) {
        const program = info.languageService.getProgram();
        if (!program) return [];
        return getSemanticDiagnostics(ts, program, fileName);
      },
    };
  }

  return { create };
}

export = init;
