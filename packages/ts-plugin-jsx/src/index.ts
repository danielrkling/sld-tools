import type * as tsModule from "typescript/lib/tsserverlibrary";
import { toJsxWithMappings } from "transform-jsx";

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
      const program = info.languageService.getProgram();
      if (!program) return;

      program.
      const tsxName = fileName + ".tsx";
      const jsxCode = toJsxWithMappings(ts.sys.readFile(fileName) || "");
      info.languageService.writeFile(fileName+".tsx", jsxCode.code);
      info.project.w

    }


    return proxy;
  }

  return { create };
}


export = init;
