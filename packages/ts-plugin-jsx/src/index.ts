import * as tsModule from "typescript/lib/tsserverlibrary";
import {
  getSemanticDiagnostics,
  getCompletionsAtPosition,
  getQuickInfoAtPosition,
  getDefinitionAndBoundSpan,
  PluginConfig,
} from "./diagnostics";

function init(modules: { typescript: typeof tsModule }) {
  const ts = modules.typescript;

  function create(info: tsModule.server.PluginCreateInfo): Partial<tsModule.LanguageService> {
    const config = info.config as PluginConfig || {};

    return {
      getSemanticDiagnostics(fileName: string): tsModule.Diagnostic[] {
        const program = info.languageService.getProgram();
        if (!program) return [];

        const fileDiagnostics = getSemanticDiagnostics(
          ts,
          program,
          fileName,
          config
        );

        return fileDiagnostics;
      },

      getCompletionsAtPosition(
        fileName: string,
        position: number,
        options?: any,
        formattingSettings?: tsModule.FormatCodeSettings
      ): tsModule.CompletionInfo | undefined {
        const program = info.languageService.getProgram();
        if (!program) return;

        const completions = getCompletionsAtPosition(
          ts,
          program,
          fileName,
          position
        );

        return completions || info.languageService.getCompletionsAtPosition(
          fileName,
          position,
          options,
          formattingSettings
        );
      },

      getQuickInfoAtPosition(
        fileName: string,
        position: number
      ): tsModule.QuickInfo | undefined {
        const program = info.languageService.getProgram();
        if (!program) return;

        return getQuickInfoAtPosition(ts, program, fileName, position)
          || info.languageService.getQuickInfoAtPosition(fileName, position);
      },

      getDefinitionAndBoundSpan(
        fileName: string,
        position: number
      ): tsModule.DefinitionInfoAndBoundSpan | undefined {
        const program = info.languageService.getProgram();
        if (!program) return;

        return getDefinitionAndBoundSpan(ts, program, fileName, position)
          || info.languageService.getDefinitionAndBoundSpan(fileName, position);
      },
    };
  }

  return { create };
}

export = init;
