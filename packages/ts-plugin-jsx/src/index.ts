import type * as tsModule from "typescript/lib/tsserverlibrary";
import { getJsxPosition, getTaggedPosition, toJsxWithMappings } from "transform-jsx";

function createSyntheticHost(
  originalProgram: tsModule.Program,
  jsxSourceFile: tsModule.SourceFile,
  fileName: string,
  ts: typeof tsModule
): tsModule.CompilerHost {
  const compilerOptions = originalProgram.getCompilerOptions();
  const originalHost = ts.createCompilerHost({ ...compilerOptions });

  return {
    getSourceFile: (name, languageVersion, onError) =>
      name === fileName ? jsxSourceFile : originalHost.getSourceFile(name, languageVersion, onError),
    getDefaultLibFileName: () => originalHost.getDefaultLibFileName(compilerOptions),
    writeFile: () => {},
    getCurrentDirectory: () => originalProgram.getCurrentDirectory(),
    getDirectories: (path) => originalHost.getDirectories?.(path) ?? [],
    getCanonicalFileName: (f) => originalHost.getCanonicalFileName(f),
    useCaseSensitiveFileNames: () => originalHost.useCaseSensitiveFileNames(),
    getNewLine: () => originalHost.getNewLine(),
    fileExists: (f) => f === fileName || originalHost.fileExists(f),
    readFile: (f) => f === fileName ? jsxSourceFile.getFullText() : originalHost.readFile(f),
    directoryExists: (d) => originalHost.directoryExists?.(d) ?? false,
    getEnvironmentVariable: (v) => originalHost.getEnvironmentVariable?.(v),
  };
}

function init(modules: { typescript: typeof tsModule }) {
  const ts = modules.typescript;

  function create(info: tsModule.server.PluginCreateInfo) {
    const proxy: tsModule.LanguageService = Object.create(null);
    for (let k of Object.keys(info.languageService) as Array<
      keyof tsModule.LanguageService
    >) {
      const x = info.languageService[k]!;
      // @ts-expect-error - JS runtime trickery which is tricky to type tersely
      proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
    }

    proxy.getQuickInfoAtPosition = (fileName, position) => {
      const originalCode = ts.sys.readFile(fileName) || "";
      const { code: jsxCode, mappings } = toJsxWithMappings(originalCode);

      const jsxPosition = getJsxPosition(position, mappings.mappings, jsxCode.length);
      if (jsxPosition === undefined) return undefined;

      const originalProgram = info.languageService.getProgram();
      if (!originalProgram) return undefined;

      const jsxSourceFile = ts.createSourceFile(
        fileName,
        jsxCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const syntheticHost = createSyntheticHost(originalProgram, jsxSourceFile, fileName, ts);
      const jsxProgram = ts.createProgram({
        rootNames: [fileName],
        options: originalProgram.getCompilerOptions(),
        host: syntheticHost,
      });

      const jsxSourceFile2 = jsxProgram.getSourceFile(fileName);
      if (!jsxSourceFile2) return undefined;

      let targetNode: tsModule.Node | undefined;
      const pos = jsxPosition;
      function findNode(node: tsModule.Node) {
        const start = node.getStart(jsxSourceFile2);
        const end = node.getEnd();
        if (pos >= start && pos <= end) {
          targetNode = node;
        }
        ts.forEachChild(node, findNode);
      }
      jsxSourceFile2.forEachChild(findNode);
      if (!targetNode) return undefined;

      const checker = jsxProgram.getTypeChecker();
      const type = checker.getTypeAtLocation(targetNode);
      if (!type) return undefined;

      const symbol = type.symbol || type.aliasSymbol;
      if (!symbol) return undefined;

      const nameStart = targetNode.getStart(jsxSourceFile2);
      const nameEnd = targetNode.getEnd();

      const taggedStart = getTaggedPosition(nameStart, mappings.reverseMappings, jsxCode.length);
      const taggedEnd = getTaggedPosition(nameEnd, mappings.reverseMappings, jsxCode.length);

      if (taggedStart === undefined || taggedEnd === undefined) return undefined;

      const symbolName = symbol.getName();
      const docInfo = [{ text: symbolName, kind: "string" as const }];

      return {
        kind: ts.ScriptElementKind.unknown,
        kindModifiers: "",
        textSpan: {
          start: taggedStart,
          length: taggedEnd - taggedStart,
        },
        displayParts: docInfo,
        documentation: [],
        tags: [],
      };
    };

    proxy.getSemanticDiagnostics = (fileName) => {
      const originalProgram = info.languageService.getProgram();
      if (!originalProgram) return [];

      const originalSourceFile = originalProgram.getSourceFile(fileName);
      if (!originalSourceFile) return [];

      const originalCode = originalSourceFile.getFullText();
      const { code: jsxCode, mappings } = toJsxWithMappings(originalCode);

      const jsxSourceFile = ts.createSourceFile(
        fileName,
        jsxCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const syntheticHost = createSyntheticHost(originalProgram, jsxSourceFile, fileName, ts);
      const jsxProgram = ts.createProgram({
        rootNames: [fileName],
        options: originalProgram.getCompilerOptions(),
        host: syntheticHost,
      });

      const jsxSourceFile2 = jsxProgram.getSourceFile(fileName);
      if (!jsxSourceFile2) return [];

      const syntacticDiagnostics = jsxProgram.getSyntacticDiagnostics(jsxSourceFile2);
      const semanticDiagnostics = jsxProgram.getSemanticDiagnostics(jsxSourceFile2);
      const allDiagnostics = [...syntacticDiagnostics, ...semanticDiagnostics];

      const result: tsModule.Diagnostic[] = [];

      for (const diag of allDiagnostics) {
        if (diag.start === undefined) continue;

        const taggedStart = getTaggedPosition(diag.start, mappings.reverseMappings, jsxCode.length);
        const taggedEnd = getTaggedPosition(diag.start + (diag.length || 0), mappings.reverseMappings, jsxCode.length);

        if (taggedStart === undefined) continue;

        const length = taggedEnd !== undefined ? taggedEnd - taggedStart : (diag.length || 1);

        result.push({
          file: originalSourceFile,
          start: taggedStart,
          length: length,
          messageText: typeof diag.messageText === "string"
            ? diag.messageText
            : diag.messageText.messageText,
          category: diag.category,
          code: diag.code,
          source: "ts-plugin-jsx",
        });
      }

      return result;
    };

    proxy.getCompletionsAtPosition = (fileName, position, options, formattingSettings) => {
      const originalCode = ts.sys.readFile(fileName) || "";
      const { code: jsxCode, mappings } = toJsxWithMappings(originalCode);

      const jsxPosition = getJsxPosition(position, mappings.mappings, jsxCode.length);
      if (jsxPosition === undefined) {
        return info.languageService.getCompletionsAtPosition(fileName, position, options, formattingSettings);
      }

      const originalProgram = info.languageService.getProgram();
      if (!originalProgram) return undefined;

      const jsxSourceFile = ts.createSourceFile(
        fileName,
        jsxCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const syntheticHost = createSyntheticHost(originalProgram, jsxSourceFile, fileName, ts);
      const jsxProgram = ts.createProgram({
        rootNames: [fileName],
        options: originalProgram.getCompilerOptions(),
        host: syntheticHost,
      });

      const jsxCompletions = info.languageService.getCompletionsAtPosition(fileName, jsxPosition, options, formattingSettings);
      if (!jsxCompletions) return undefined;

      return jsxCompletions;
    };

    proxy.getDefinitionAtPosition = (fileName, position) => {
      const originalCode = ts.sys.readFile(fileName) || "";
      const { code: jsxCode, mappings } = toJsxWithMappings(originalCode);

      const jsxPosition = getJsxPosition(position, mappings.mappings, jsxCode.length);
      if (jsxPosition === undefined) return undefined;

      const originalProgram = info.languageService.getProgram();
      if (!originalProgram) return undefined;

      const jsxSourceFile = ts.createSourceFile(
        fileName,
        jsxCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const syntheticHost = createSyntheticHost(originalProgram, jsxSourceFile, fileName, ts);
      ts.createProgram({
        rootNames: [fileName],
        options: originalProgram.getCompilerOptions(),
        host: syntheticHost,
      });

      const jsxDefinitions = info.languageService.getDefinitionAtPosition(fileName, jsxPosition);
      if (!jsxDefinitions) return undefined;

      const result: tsModule.DefinitionInfo[] = [];

      for (const def of jsxDefinitions) {
        const taggedStart = getTaggedPosition(def.textSpan.start, mappings.reverseMappings, jsxCode.length);
        if (taggedStart === undefined) continue;

        result.push({
          ...def,
          textSpan: {
            start: taggedStart,
            length: def.textSpan.length,
          },
        });
      }

      return result.length > 0 ? result : undefined;
    };

    proxy.getReferencesAtPosition = (fileName, position) => {
      const originalCode = ts.sys.readFile(fileName) || "";
      const { code: jsxCode, mappings } = toJsxWithMappings(originalCode);

      const jsxPosition = getJsxPosition(position, mappings.mappings, jsxCode.length);
      if (jsxPosition === undefined) return undefined;

      const originalProgram = info.languageService.getProgram();
      if (!originalProgram) return undefined;

      const jsxSourceFile = ts.createSourceFile(
        fileName,
        jsxCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const syntheticHost = createSyntheticHost(originalProgram, jsxSourceFile, fileName, ts);
      ts.createProgram({
        rootNames: [fileName],
        options: originalProgram.getCompilerOptions(),
        host: syntheticHost,
      });

      const jsxReferences = info.languageService.getReferencesAtPosition(fileName, jsxPosition);
      if (!jsxReferences) return undefined;

      const result: tsModule.ReferenceEntry[] = [];

      for (const ref of jsxReferences) {
        if (ref.fileName !== fileName) {
          result.push(ref);
          continue;
        }

        const taggedStart = getTaggedPosition(ref.textSpan.start, mappings.reverseMappings, jsxCode.length);
        if (taggedStart === undefined) continue;

        result.push({
          ...ref,
          textSpan: {
            start: taggedStart,
            length: ref.textSpan.length,
          },
        });
      }

      return result.length > 0 ? result : undefined;
    };

    proxy.findReferences = (fileName, position) => {
      const originalCode = ts.sys.readFile(fileName) || "";
      const { code: jsxCode, mappings } = toJsxWithMappings(originalCode);

      const jsxPosition = getJsxPosition(position, mappings.mappings, jsxCode.length);
      if (jsxPosition === undefined) return undefined;

      const originalProgram = info.languageService.getProgram();
      if (!originalProgram) return undefined;

      const jsxSourceFile = ts.createSourceFile(
        fileName,
        jsxCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const syntheticHost = createSyntheticHost(originalProgram, jsxSourceFile, fileName, ts);
      ts.createProgram({
        rootNames: [fileName],
        options: originalProgram.getCompilerOptions(),
        host: syntheticHost,
      });

      const jsxRefs = info.languageService.findReferences(fileName, jsxPosition);
      if (!jsxRefs) return undefined;

      const result: tsModule.ReferencedSymbol[] = [];

      for (const ref of jsxRefs) {
        const mappedRefs: tsModule.ReferenceEntry[] = [];

        for (const entry of ref.references) {
          if (entry.fileName !== fileName) {
            mappedRefs.push(entry);
            continue;
          }

          const taggedStart = getTaggedPosition(entry.textSpan.start, mappings.reverseMappings, jsxCode.length);
          if (taggedStart === undefined) continue;

          mappedRefs.push({
            ...entry,
            textSpan: {
              start: taggedStart,
              length: entry.textSpan.length,
            },
          });
        }

        if (mappedRefs.length > 0) {
          result.push({
            ...ref,
            references: mappedRefs,
          });
        }
      }

      return result.length > 0 ? result : undefined;
    };

    return proxy;
  }

  return { create };
}

export = init;
