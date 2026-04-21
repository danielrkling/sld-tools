import type * as tsModule from "typescript/lib/tsserverlibrary";
import { getTaggedPosition, toJsxWithMappings } from "transform-jsx";

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

function analyzeJsx(
  fileName: string,
  info: tsModule.server.PluginCreateInfo,
  ts: typeof tsModule
): { jsxProgram: tsModule.Program; jsxSourceFile: tsModule.SourceFile; mappings: any; jsxCode: string } | undefined {
  const originalProgram = info.languageService.getProgram();
  if (!originalProgram) return undefined;

  const originalSourceFile = originalProgram.getSourceFile(fileName);
  if (!originalSourceFile) return undefined;

  const originalCode = originalSourceFile.getFullText();
  const { code: jsxCode, mappings } = toJsxWithMappings(originalCode);

  // No jsx tag - let default TypeScript handle it
  if (jsxCode === originalCode) return undefined;

  const jsxSourceFile = ts.createSourceFile(fileName, jsxCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const syntheticHost = createSyntheticHost(originalProgram, jsxSourceFile, fileName, ts);
  const jsxProgram = ts.createProgram({
    rootNames: [fileName],
    options: originalProgram.getCompilerOptions(),
    host: syntheticHost,
  });

  return { jsxProgram, jsxSourceFile, mappings, jsxCode };
}

function mapDiagnostic(diag: tsModule.Diagnostic, mappings: any, jsxCodeLen: number): tsModule.Diagnostic | undefined {
  if (diag.start === undefined) return undefined;

  const taggedStart = getTaggedPosition(diag.start, mappings.reverseMappings, jsxCodeLen);
  const taggedEnd = getTaggedPosition(diag.start + (diag.length || 0), mappings.reverseMappings, jsxCodeLen);

  if (taggedStart === undefined) return undefined;

  const length = taggedEnd !== undefined ? taggedEnd - taggedStart : (diag.length || 1);

  return {
    file: diag.file,
    start: taggedStart,
    length: length,
    messageText: typeof diag.messageText === "string" ? diag.messageText : diag.messageText.messageText,
    category: diag.category,
    code: diag.code,
    source: "ts-plugin-jsx",
  };
}

function init(modules: { typescript: typeof tsModule }) {
  const ts = modules.typescript;

  function create(info: tsModule.server.PluginCreateInfo) {
    const proxy: tsModule.LanguageService = Object.create(null);
    for (let k of Object.keys(info.languageService) as Array<keyof tsModule.LanguageService>) {
      const x = info.languageService[k]!;
      //@ts-expect-error
      proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
    }

    proxy.getSemanticDiagnostics = (fileName) => {
      const jsx = analyzeJsx(fileName, info, ts);
      if (!jsx) {
        return undefined as unknown as tsModule.Diagnostic[]; // Let default TypeScript handle it
      }

      const { jsxProgram, jsxSourceFile, mappings, jsxCode } = jsx;
      const syntactic = jsxProgram.getSyntacticDiagnostics(jsxSourceFile);
      const semantic = jsxProgram.getSemanticDiagnostics(jsxSourceFile);

      const result: tsModule.Diagnostic[] = [];
      for (const diag of [...syntactic, ...semantic]) {
        const mapped = mapDiagnostic(diag, mappings, jsxCode.length);
        if (mapped) result.push(mapped);
      }

      return result;
    };

    return proxy;
  }

  return { create };
}

export = init;