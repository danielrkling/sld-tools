import type * as ts from "typescript/lib/tsserverlibrary";
import {
  getSLDTemplatesNodes,
  parseTemplate,
  COMPONENT_NODE,
  STATIC_PROP,
  BOOLEAN_PROP,
  MIXED_PROP,
  DYNAMIC_PROP,
  ELEMENT_NODE,
} from "./parse";
import { SyntaxKind } from "html5parser";

export function getSemanticDiagnostics(
  ts: typeof import("typescript/lib/tsserverlibrary"),
  program: ts.Program,
  fileName: string
): ts.Diagnostic[] {
  const diagnostics: ts.Diagnostic[] = [];

  const sourceFile = program.getSourceFile(fileName);
  const checker = program.getTypeChecker();
  if (!sourceFile) return [];

  const templates = getSLDTemplatesNodes(ts, sourceFile);

  templates.forEach((node) => {
    const template = node.template;

    const nodes = parseTemplate(ts, sourceFile, template);
    // const type = checker.getTypeAtLocation(node.tag);
    const sym = checker.getSymbolAtLocation(node.tag)!;
    const type = checker.getTypeOfSymbolAtLocation(sym, node);
    const components = checker.getTypeOfSymbolAtLocation(
      type.getProperty("components")!,
      node
    );

    nodes.children.forEach(function walk(n) {
      if (n.type === COMPONENT_NODE) {
        const comp = components.getProperty(n.name);
        const fnType =
          comp &&
          comp.valueDeclaration &&
          checker.getTypeOfSymbolAtLocation(comp, comp?.valueDeclaration);

        if (fnType) {
          const propType = getTypeFromVirtualTypeLiteral(
            ts.factory.createTypeLiteralNode(
              n.props.map((prop) => {
                let type;
                if (prop.type === BOOLEAN_PROP) {
                  type = ts.factory.createKeywordTypeNode(
                    ts.SyntaxKind.BooleanKeyword
                  );
                } else if (
                  prop.type === STATIC_PROP ||
                  prop.type === MIXED_PROP
                ) {
                  type = ts.factory.createKeywordTypeNode(
                    ts.SyntaxKind.StringKeyword
                  );
                } else if (prop.type === DYNAMIC_PROP) {
                  if (!ts.isTemplateExpression(template)) throw new Error();
                  const expression =
                    template.templateSpans[prop.value].expression;

                  type = checker.typeToTypeNode(
                    checker.getTypeAtLocation(expression),
                    expression.parent,
                    ts.NodeBuilderFlags.NoTruncation
                  );
                }

                return ts.factory.createPropertySignature(
                  undefined,
                  prop.name,
                  undefined,
                  type
                );
              })
            ),
            program,
            ts
          );

          if (!canCallWithArgs(ts, checker, fnType, [propType])) {
            diagnostics.push({
              file: sourceFile,
              start: n.node.open.start + 1,
              length: n.name.length,
              messageText: `${n.name} have invalid arguments`,
              category: ts.DiagnosticCategory.Error,
              code: 9999,
            });
          }
        } else {
          diagnostics.push({
            file: sourceFile,
            start: n.node.open.start + 1,
            length: n.name.length,
            messageText: `${n.name} is not defined`,
            category: ts.DiagnosticCategory.Error,
            code: 9999,
          });
        }
      }
      if (n.type === ELEMENT_NODE || n.type === COMPONENT_NODE) {
        n.children?.forEach(walk);
      }
    });
  });

  return diagnostics;
}

export function getFunctionTypeFromTemplate(
  ts: typeof import("typescript/lib/tsserverlibrary"),
  checker: ts.TypeChecker,
  template: ts.TaggedTemplateExpression,
  name: string
) {
  const sym = checker.getSymbolAtLocation(template.tag)!;
  const type = checker.getTypeOfSymbolAtLocation(sym, template);
  const components = checker.getTypeOfSymbolAtLocation(
    type.getProperty("components")!,
    template
  );
  const comp = components.getProperty(name);
  const fnType =
    comp &&
    comp.valueDeclaration &&
    checker.getTypeOfSymbolAtLocation(comp, comp?.valueDeclaration);

  return fnType;
}

export function getPropertyTypeFromTemplate(
  ts: typeof import("typescript/lib/tsserverlibrary"),
  checker: ts.TypeChecker,
  template: ts.TaggedTemplateExpression,
  componentName: string,
  propName: string
) {
  const fnType = getFunctionTypeFromTemplate(
    ts,
    checker,
    template,
    componentName
  );
  if (!fnType) return;
  const signatures = fnType.getCallSignatures();
  if (signatures.length === 0) return;
  const signature = signatures[0];
  const type = signature.getParameters()[0];
  if (!type) return;
  const typeAtLocation = checker.getTypeOfSymbolAtLocation(
    type,
    type.valueDeclaration!
  );
  const typeArgs = typeAtLocation.getProperty(propName);
  if (!typeArgs) return;
  return checker.getTypeOfSymbolAtLocation(typeArgs, typeArgs.valueDeclaration!);
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
