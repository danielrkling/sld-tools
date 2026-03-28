import vscode from "vscode";
import { sldToJsx as transformSldToJsx, jsxToSld as transformJsxToSld } from "transform-jsx";

const CONFIG_KEY = "sld-tools.preferredTag";
const DEFAULT_TAG = "jsx";

function getPreferredTag(): string {
  return vscode.workspace.getConfiguration().get<string>(CONFIG_KEY, DEFAULT_TAG);
}

function getFullDocumentRange(document: vscode.TextDocument): vscode.Range {
  const lastLine = document.lineCount - 1;
  return new vscode.Range(
    0, 0,
    lastLine,
    document.lineAt(lastLine).text.length
  );
}

export async function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("sld-tools.convertToJsx", async (uri?: vscode.Uri) => {
      const document = uri 
        ? await vscode.workspace.openTextDocument(uri)
        : vscode.window.activeTextEditor?.document;
      
      if (!document) return;
      
      const text = document.getText();
      const tag = getPreferredTag();
      const result = transformSldToJsx(text, { tags: [tag] });
      
      if (result !== text) {
        const edit = new vscode.TextEdit(getFullDocumentRange(document), result);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sld-tools.convertToSld", async (uri?: vscode.Uri) => {
      const document = uri 
        ? await vscode.workspace.openTextDocument(uri)
        : vscode.window.activeTextEditor?.document;
      
      if (!document) return;
      
      const text = document.getText();
      const tag = getPreferredTag();
      const result = transformJsxToSld(text, { tag });
      
      if (result !== text) {
        const edit = new vscode.TextEdit(getFullDocumentRange(document), result);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sld-tools.toggle", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      
      const document = editor.document;
      const text = document.getText();
      const tag = getPreferredTag();
      
      const templateRegex = new RegExp(`${tag}\`[\\s\\S]*?\``, 'g');
      const hasTemplates = templateRegex.test(text);
      
      if (hasTemplates) {
        const result = transformSldToJsx(text, { tags: [tag] });
        if (result !== text) {
          const edit = new vscode.TextEdit(getFullDocumentRange(document), result);
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
        }
      } else {
        const result = transformJsxToSld(text, { tag });
        if (result !== text) {
          const edit = new vscode.TextEdit(getFullDocumentRange(document), result);
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
        }
      }
    })
  );
}

export async function deactivate(): Promise<void> {}
