// Import the necessary TypeScript types
import type * as ts from "typescript/lib/tsserverlibrary";
import { parse, SyntaxKind } from "html5parser";

const markerSymbol = "⦿"; // Unique symbol to avoid collisions
const newLineMarker = "⊙";
const match = /\${[⦿⊙]*}/;
const onlyMatch = /^\${[⦿⊙]*}/;

function init(modules: { typescript: typeof ts }) {
  const ts = modules.typescript;

  // This is the main plugin function that returns the modified LanguageService.
  function create(
    info: ts.server.PluginCreateInfo
  ): Partial<ts.LanguageService> {
    // Intercept the getSemanticDiagnostics method.
    function getSemanticDiagnostics(fileName: string): ts.Diagnostic[] {
      const diagnostics: ts.Diagnostic[] = [];
      const program = info.languageService.getProgram();

      if (!program) return [];
      const sourceFile = program.getSourceFile(fileName);
      const checker = program.getTypeChecker();

      if (sourceFile) {
        // Find all tagged template literals named "sld".
        ts.forEachChild(sourceFile, function visit(node) {
          if (ts.isTaggedTemplateExpression(node)) {
            const tag = node.tag.getText(sourceFile);
            const template = node.template;

            if (/sld/i.test(tag)) {
              const ast = parseTemplate(template, sourceFile, ts);
              // const type = checker.getTypeAtLocation(node.tag);
              const sym = checker.getSymbolAtLocation(node.tag)!;
              const type = checker.getTypeOfSymbolAtLocation(sym, node);
              let i = 0;
              ast.forEach(function walk(n) {
                if (n.type === SyntaxKind.Text) {
                  const count = n.value.match(match)?.length ?? 0;
                  i += count;
                  return;
                }
                const name = n.rawName;
                if (/^[A-Z]/.test(name)) {
                  const comp = type.getProperty(name);
                  const fnType =
                    comp &&
                    comp.valueDeclaration &&
                    checker.getTypeOfSymbolAtLocation(
                      comp,
                      comp?.valueDeclaration
                    );

                  if (fnType) {
                    console.log(checker.typeToString(fnType));

                    const propType = getTypeFromVirtualTypeLiteral(
                      ts.factory.createTypeLiteralNode(
                        n.attributes.map((attr) => {
                          const count =
                            attr.value?.value.match(match)?.length ?? 0;

                          const macth1 = attr.value?.value.match(onlyMatch);
                          const expression =
                            macth1 && ts.isTemplateExpression(template)
                              ? template.templateSpans[i].expression
                              : null;
                          const type =
                            expression && checker.getTypeAtLocation(expression);
                          const typeNode =
                            expression &&
                            type &&
                            checker.typeToTypeNode(
                              type,
                              expression.parent,
                              ts.NodeBuilderFlags.NoTruncation
                            );
                          i += count;

                          const attrType = typeNode
                            ? typeNode
                            : attr.value === undefined
                            ? ts.factory.createKeywordTypeNode(
                                ts.SyntaxKind.BooleanKeyword
                              )
                            : ts.factory.createKeywordTypeNode(
                                ts.SyntaxKind.StringKeyword
                              );

                          return ts.factory.createPropertySignature(
                            undefined,
                            attr.name.value,
                            undefined,
                            attrType
                          );
                        })
                      ),
                      program,
                      ts
                    );

                    console.log(checker.typeToString(propType));
                    if (!canCallWithArgs(ts, checker, fnType, [propType])) {
                      diagnostics.push({
                        file: sourceFile,
                        start: n.open.start + 1,
                        length: n.name.length,
                        messageText: `${name} have invalid arguments`,
                        category: ts.DiagnosticCategory.Error,
                        code: 9999,
                      });
                    }
                  } else {
                    diagnostics.push({
                      file: sourceFile,
                      start: n.open.start + 1,
                      length: n.name.length,
                      messageText: `${name} is not defined`,
                      category: ts.DiagnosticCategory.Error,
                      code: 9999,
                    });
                  }
                }
                n.body?.forEach(walk);
              });
            }
          }
          ts.forEachChild(node, visit);
        });
      }

      return diagnostics;
    }

    return {
      getSemanticDiagnostics,
      getFormattingEditsForDocument(
        fileName: string,
        options: ts.FormatCodeSettings
      ) {
        return getFormattingEditsForDocument(fileName, options, info, ts);
      },
    };
  }

  return { create };
}

//@ts-expect-error
export = init;

function parseTemplate(
  template: ts.TemplateLiteral,
  sourceFile: ts.SourceFile,
  tsApi: typeof ts
) {
  const ts = tsApi;

  const fullText = sourceFile.getFullText();

  // Pre-template slice: exactly from start of file to template start
  const preTemplate = fullText
    .slice(0, template.getStart() + 1)
    .replace(/\S/g, " ");

  // Post-template slice: from template end to end of file
  const postTemplate = fullText
    .slice(template.getEnd() - 1)
    .replace(/\S/g, " ");

  let templateText = "";

  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    templateText = template.text;
  } else if (ts.isTemplateExpression(template)) {
    // For TemplateExpressions, reconstruct text with placeholders for expressions,
    // preserving exact length and new lines.

    // Start with the head text as is
    templateText = template.head.text;

    for (const span of template.templateSpans) {
      const exprText = span.expression.getText(sourceFile);
      const exprLength = exprText.length;

      // Replace expression text characters with markers (except new lines)
      let replacedExpr = "";
      for (let i = 0; i < exprLength; i++) {
        const ch = exprText[i];
        replacedExpr += ch === "\n" ? newLineMarker : markerSymbol;
      }

      // We must include the `${` and `}` around the expression
      // `${` is 2 chars, `}` is 1 char, total 3 chars
      // So total length of placeholder = exprLength + 3
      // The replacedExpr covers only the expression chars
      // Final placeholder: `${${replacedExpr}}`

      templateText += "${" + replacedExpr + "}" + span.literal.text;
    }
  }

  const html = preTemplate + templateText + postTemplate;

  return parse(html);
}

function canCallWithArgs(
  tsApi: typeof ts,
  checker: ts.TypeChecker,
  functionType: ts.Type,
  argTypes: ts.Type[]
): boolean {
  const signatures = functionType.getCallSignatures();
  return signatures.some((sig) =>
    areArgsCompatibleWithSignature(tsApi, checker, argTypes, sig)
  );
}

function areArgsCompatibleWithSignature(
  tsApi: typeof ts,
  checker: ts.TypeChecker,
  argTypes: ts.Type[],
  signature: ts.Signature
): boolean {
  const params = signature.getParameters();

  // Handle rest parameters
  const hasRest = signatureHasRestParameter(tsApi, signature);

  // Quick length checks:
  if (!hasRest && argTypes.length > params.length) return false;
  if (
    argTypes.length <
    params.filter((param) => {
      const decl = param.valueDeclaration ?? param.declarations?.[0];
      return (
        decl &&
        tsApi.isParameter(decl) &&
        !decl.questionToken &&
        !signatureHasRestParameter(tsApi, signature)
      );
    }).length
  )
    return false;

  // Check each argument against param type
  for (let i = 0; i < argTypes.length; i++) {
    const paramIndex =
      hasRest && i >= params.length - 1 ? params.length - 1 : i;
    const param = params[paramIndex];
    const paramType = checker.getTypeOfSymbolAtLocation(
      param,
      param.valueDeclaration!
    );

    if (!checker.isTypeAssignableTo(argTypes[i], paramType)) {
      return false; // argument incompatible with parameter
    }
  }

  return true; // all args compatible
}

function signatureHasRestParameter(
  tsApi: typeof ts,
  signature: ts.Signature
): boolean {
  const parameters = signature.getParameters();
  if (parameters.length === 0) return false;

  const lastParam = parameters[parameters.length - 1];
  const decl = lastParam.valueDeclaration ?? lastParam.declarations?.[0];

  return decl !== undefined && tsApi.isParameter(decl) && !!decl.dotDotDotToken;
}

function getTypeFromVirtualTypeLiteral(
  typeLiteral: ts.TypeLiteralNode,
  orginalProgram: ts.Program,
  tsApi: typeof ts
): ts.Type {
  const alias = tsApi.factory.createTypeAliasDeclaration(
    undefined,
    "FakeProps",
    undefined,
    typeLiteral
  );

  const sf = tsApi.factory.createSourceFile(
    [alias],
    tsApi.factory.createToken(tsApi.SyntaxKind.EndOfFileToken),
    tsApi.NodeFlags.None
  );

  const virtualText = tsApi.createPrinter().printFile(sf);

  const fileName = "virtual.ts";

  const sourceFile = tsApi.createSourceFile(
    fileName,
    virtualText,
    tsApi.ScriptTarget.Latest,
    true
  );

  const host: ts.CompilerHost = {
    fileExists: (f) => f === fileName,
    readFile: (f) => (f === fileName ? virtualText : undefined),
    getSourceFile: (f, version) => (f === fileName ? sourceFile : undefined),
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    getDefaultLibFileName: () => "lib.d.ts",
    getNewLine: () => "\n",
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };

  const program = tsApi.createProgram(
    [fileName],
    orginalProgram.getCompilerOptions(),
    host
  );
  const checker = program.getTypeChecker();

  const fakeFile = program.getSourceFile(fileName)!;
  const fakeAlias = fakeFile.statements[0] as ts.TypeAliasDeclaration;

  return checker.getTypeAtLocation(fakeAlias);
}

function getFormattingEditsForDocument(
  fileName: string,
  options: ts.FormatCodeSettings,
  info: ts.server.PluginCreateInfo,
  ts: typeof import("typescript")
): ts.TextChange[] {
  const changes: ts.TextChange[] = [];

  const program = info.languageService.getProgram();
  if (!program) return [];

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return [];

  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isTaggedTemplateExpression(node)) {
      const tag = node.tag.getText(sourceFile);

      if (/sld/i.test(tag)) {
        const template = node.template;

        if (ts.isNoSubstitutionTemplateLiteral(template)) {
          // No substitutions, just text
          const rawText = template.text;
          const trimmed = rawText.trim();

          console.log(rawText,trimmed)

          if (trimmed !== rawText) {
            changes.push({
              span: { start: template.getStart() + 1, length: rawText.length }, // +1 to skip the opening backtick `
              newText: trimmed,
            });
          }
        } else if (ts.isTemplateExpression(template)) {
          // For simplicity, skip TemplateExpressions with substitutions
          // or implement a more complex logic if needed
        }
      }
    }
    ts.forEachChild(node, visit);
  });

  return changes;
}
