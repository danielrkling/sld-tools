import * as ts from "typescript";
import { parseSLDTemplate, getSLDTemplatesNodes } from "./parse";
import { sldToJsx } from "./jsx";

export interface SldTransformerOptions {
  jsxOutput?: boolean;
}

export function createSldTransformer(
  program: ts.Program,
  options?: SldTransformerOptions
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile) => {
      const checker = program.getTypeChecker();
      const sldNodes = getSLDTemplatesNodes(ts, sourceFile);

      if (sldNodes.length === 0) {
        return sourceFile;
      }

      const visitor = (node: ts.Node): ts.Node => {
        if (ts.isTaggedTemplateExpression(node)) {
          const tagName = node.tag.getText(sourceFile);
          if (/sld/i.test(tagName)) {
            const jsxCode = sldToJsx(ts, checker, sourceFile, node);
            return parseJsxString(jsxCode, sourceFile, context) ?? node;
          }
        }
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitEachChild(sourceFile, visitor, context);
    };
  };
}

function parseJsxString(
  jsxCode: string,
  sourceFile: ts.SourceFile,
  context: ts.TransformationContext
): ts.Node | undefined {
  try {
    const tempFileName = sourceFile.fileName.replace(/\.tsx?$/, ".tsx");
    const tempSourceFile = ts.createSourceFile(
      tempFileName,
      `export const x = ${jsxCode}`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const varDecl = tempSourceFile.statements[0] as ts.VariableStatement;
    const varDeclList = varDecl.declarationList.declarations[0];
    return varDeclList.initializer;
  } catch {
    return undefined;
  }
}

export const version = "1.0.0";

export function before(
  program: ts.Program,
  options: SldTransformerOptions
): ts.Transformer<ts.SourceFile> {
  return createSldTransformer(program, options)({} as any);
}

export function after(
  program: ts.Program,
  options: SldTransformerOptions
): ts.Transformer<ts.SourceFile> {
  return createSldTransformer(program, options)({} as any);
}
