import vscode from "vscode";
import { toJsx, toTagged } from "transform-jsx";

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
      const result = toJsx(text);
      
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
      const result = toTagged(text);
      
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
      const tag = "jsx";
      
      const templateRegex = new RegExp(`${tag}\`[\\s\\S]*?\``, 'g');
      const hasTemplates = templateRegex.test(text);
      
      if (hasTemplates) {
        const result = toJsx(text);
        if (result !== text) {
          const edit = new vscode.TextEdit(getFullDocumentRange(document), result);
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
        }
      } else {
        const result = toTagged(text);
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
