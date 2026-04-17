import vscode from "vscode";
import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { toJsxWithMappings, getJsxPosition } from "transform-jsx";

function getTypeScriptLibPath(): string {
  return path.dirname(require.resolve("typescript"));
}

function findJsxTemplateRange(
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.Range | undefined {
  const text = document.getText();
  const templateStart = text.indexOf("jsx`", position.character);
  if (templateStart === -1 || templateStart > position.character + 10) return undefined;
  
  let depth = 0;
  let inTemplate = false;
  let startPos = -1;
  let endPos = -1;
  
  for (let i = templateStart; i < text.length; i++) {
    const char = text[i];
    if (text.substring(i, i + 4) === "jsx`") {
      if (!inTemplate && (i <= position.character + position.line * 10000)) {
        inTemplate = true;
        startPos = i;
      }
    }
    if (inTemplate) {
      if (char === '`' && text[i - 1] !== '\\') {
        if (depth === 0) {
          endPos = i + 1;
          break;
        }
      }
    }
  }
  
  if (startPos === -1 || endPos === -1) return undefined;
  
  const startLine = text.substring(0, startPos).split('\n').length - 1;
  const endLine = text.substring(0, endPos).split('\n').length - 1;
  
  return new vscode.Range(startLine, startPos - text.substring(0, startPos).lastIndexOf('\n') - 1, endLine, endPos - text.substring(0, endPos).lastIndexOf('\n') - 1);
}

function isPositionInTemplate(
  document: vscode.TextDocument,
  position: vscode.Position
): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);
  
  const templateRegex = /jsx`[\s\S]*?`/g;
  let match;
  while ((match = templateRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset >= start && offset <= end) {
      return true;
    }
  }
  return false;
}

let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("JSX Tagged Templates");
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(
    vscode.commands.registerCommand("jsx-tagged.convertToJsx", async (uri?: vscode.Uri) => {
      const document = uri 
        ? await vscode.workspace.openTextDocument(uri)
        : vscode.window.activeTextEditor?.document;
      
      if (!document) return;
      
      const text = document.getText();
      const result = toJsxWithMappings(text).code;
      
      if (result !== text) {
        const edit = new vscode.TextEdit(
          new vscode.Range(0, 0, document.lineCount, 0),
          result
        );
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("jsx-tagged.convertToSld", async (uri?: vscode.Uri) => {
      const { toTagged } = await import("transform-jsx");
      const document = uri 
        ? await vscode.workspace.openTextDocument(uri)
        : vscode.window.activeTextEditor?.document;
      
      if (!document) return;
      
      const text = document.getText();
      const result = toTagged(text);
      
      if (result !== text) {
        const edit = new vscode.TextEdit(
          new vscode.Range(0, 0, document.lineCount, 0),
          result
        );
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("jsx-tagged.toggle", async () => {
      const { toJsx, toTagged } = await import("transform-jsx");
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      
      const document = editor.document;
      const text = document.getText();
      const tag = "jsx";
      
      const templateRegex = new RegExp(`${tag}\`[\\s\\S]*?\``, 'g');
      const hasTemplates = templateRegex.test(text);
      
      if (hasTemplates) {
        const result = toJsx(text);
        if (result !== text) {
          const edit = new vscode.TextEdit(
            new vscode.Range(0, 0, document.lineCount, 0),
            result
          );
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
        }
      } else {
        const result = toTagged(text);
        if (result !== text) {
          const edit = new vscode.TextEdit(
            new vscode.Range(0, 0, document.lineCount, 0),
            result
          );
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
        }
      }
    })
  );

  // context.subscriptions.push(
  //   vscode.languages.registerHoverProvider(
  //     [
  //       { language: "javascript", scheme: "file" },
  //       { language: "javascript", scheme: "untitled" },
  //       { language: "javascriptreact", scheme: "file" },
  //       { language: "javascriptreact", scheme: "untitled" },
  //       { language: "typescript", scheme: "file" },
  //       { language: "typescript", scheme: "untitled" },
  //       { language: "typescriptreact", scheme: "file" },
  //       { language: "typescriptreact", scheme: "untitled" },
  //     ],
  //     {
  //       provideHover(document, position, token) {
  //         outputChannel.appendLine(`Hover at ${position.line}:${position.character}`);
          
  //         if (!isPositionInTemplate(document, position)) {
  //           outputChannel.appendLine("Not in template");
  //           return undefined;
  //         }

  //         const text = document.getText();
  //         const offset = document.offsetAt(position);
  //         outputChannel.appendLine(`Offset: ${offset}`);
          
  //         const { code: jsxCode, mappings } = toJsxWithMappings(text);
  //         outputChannel.appendLine(`JSX Code: ${jsxCode.substring(0, 100)}`);
  //         outputChannel.appendLine(`Mappings: ${mappings.mappings.length} entries`);
          
  //         const jsxPosition = getJsxPosition(offset, mappings.mappings, jsxCode.length);
  //         outputChannel.appendLine(`JSX Position: ${jsxPosition}`);
          
  //         if (jsxPosition === undefined) {
  //           outputChannel.appendLine("No mapped position");
  //           return undefined;
  //         }

  //         const mappedPosition = jsxPosition;

  //         const jsxSourceFile = ts.createSourceFile(
  //           document.uri.fsPath,
  //           jsxCode,
  //           ts.ScriptTarget.Latest,
  //           true,
  //           ts.ScriptKind.TSX
  //         );

  //         const program = ts.createProgram({
  //           rootNames: [document.uri.fsPath],
  //           options: {
  //             target: ts.ScriptTarget.ES2020,
  //             module: ts.ModuleKind.ESNext,
  //             jsx: ts.JsxEmit.React,
  //             strict: true,
  //           },
  //           host: {
  //             getSourceFile: (name) => {
  //               if (name === document.uri.fsPath) return jsxSourceFile;
  //               const libName = name.replace(/^.*[\\\/]/, "");
  //               if (libName.startsWith("lib.") && libName.endsWith(".d.ts")) {
  //                 const libPath = path.join(getTypeScriptLibPath(), libName);
  //                 if (fs.existsSync(libPath)) {
  //                   return ts.createSourceFile(
  //                     name,
  //                     fs.readFileSync(libPath, "utf-8"),
  //                     ts.ScriptTarget.Latest,
  //                     true
  //                   );
  //                 }
  //               }
  //               return undefined;
  //             },
  //             getDefaultLibFileName: () => "lib.d.ts",
  //             writeFile: () => {},
  //             getCurrentDirectory: () => "",
  //             getDirectories: () => [],
  //             getCanonicalFileName: (f) => f,
  //             useCaseSensitiveFileNames: () => true,
  //             getNewLine: () => "\n",
  //             fileExists: (f) => f === document.uri.fsPath || fs.existsSync(f),
  //             readFile: (f) => f === document.uri.fsPath ? undefined : (fs.existsSync(f) ? fs.readFileSync(f, "utf-8") : undefined),
  //             directoryExists: (d) => {
  //               try {
  //                 return fs.statSync(d).isDirectory();
  //               } catch {
  //                 return false;
  //               }
  //             },
  //           },
  //         });

  //         const checker = program.getTypeChecker();

  //         let targetNode: ts.Node | undefined;
  //         function findNode(node: ts.Node) {
  //           const start = node.getStart(jsxSourceFile);
  //           const end = node.getEnd();
  //           if (start !== undefined && end !== undefined && mappedPosition >= start && mappedPosition <= end) {
  //             targetNode = node;
  //           }
  //           ts.forEachChild(node, findNode);
  //         }
  //         jsxSourceFile.forEachChild(findNode);

  //         if (!targetNode) {
  //           outputChannel.appendLine("No target node found");
  //           return undefined;
  //         }
  //         outputChannel.appendLine(`Found node: ${targetNode.getText(jsxSourceFile)}`);

  //         const type = checker.getTypeAtLocation(targetNode);
  //         if (!type) {
  //           outputChannel.appendLine("No type found");
  //           return undefined;
  //         }
  //         outputChannel.appendLine(`Got type`);

  //         const symbol = type.symbol || type.aliasSymbol;
  //         if (!symbol) {
  //           outputChannel.appendLine("No symbol found");
  //           return undefined;
  //         }

  //         const name = symbol.getName();
  //         outputChannel.appendLine(`Symbol name: ${name}`);
  //         const displayText = name;

  //         const markdown = new vscode.MarkdownString();
  //         markdown.appendCodeblock(displayText, "typescript");

  //         return new vscode.Hover(markdown, new vscode.Range(position, position));
  //       }
  //     }
  //   )
  // );
}

export async function deactivate(): Promise<void> {}
