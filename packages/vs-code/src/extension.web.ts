import vscode from "vscode";

let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Tagged JSX Tools (Web)");
  context.subscriptions.push(outputChannel);

  // Register commands for web - simplified version
  context.subscriptions.push(
    vscode.commands.registerCommand("tagged-jsx.regenerateGrammar", async () => {
      vscode.window.showInformationMessage("Grammar regeneration only available in desktop version");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tagged-jsx.convertToJsx", async (uri?: vscode.Uri) => {
      const document = uri
        ? await vscode.workspace.openTextDocument(uri)
        : vscode.window.activeTextEditor?.document;

      if (!document) return;

      try {
        const transformModule = await import("@tagged-jsx/transform");
        const text = document.getText();
        const result = transformModule.toJsx(text);

        if (result !== text) {
          const edit = new vscode.TextEdit(
            new vscode.Range(0, 0, document.lineCount, 0),
            result
          );
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
        }
      } catch (error) {
        outputChannel.appendLine("Convert to JSX error: " + String(error));
        vscode.window.showErrorMessage("Failed to convert to JSX: " + String(error));
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tagged-jsx.convertToTagged", async (uri?: vscode.Uri) => {
      const document = uri
        ? await vscode.workspace.openTextDocument(uri)
        : vscode.window.activeTextEditor?.document;

      if (!document) return;

      try {
        const transformModule = await import("@tagged-jsx/transform");
        const text = document.getText();
        const result = transformModule.toTagged(text);

        if (result !== text) {
          const edit = new vscode.TextEdit(
            new vscode.Range(0, 0, document.lineCount, 0),
            result
          );
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
        }
      } catch (error) {
        outputChannel.appendLine("Convert to Tagged error: " + String(error));
        vscode.window.showErrorMessage("Failed to convert to Tagged: " + String(error));
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tagged-jsx.toggle", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const text = document.getText();
      const tag = "jsx";

      const templateRegex = new RegExp(tag + "\x60[\\s\\S]*?\x60", "g");
      const hasTemplates = templateRegex.test(text);

      try {
        const transformModule = await import("@tagged-jsx/transform");

        let result: string;

        if (hasTemplates) {
          result = transformModule.toJsx(text);
        } else {
          result = transformModule.toTagged(text);
        }

        if (result !== text) {
          const edit = new vscode.TextEdit(
            new vscode.Range(0, 0, document.lineCount, 0),
            result
          );
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
        }
      } catch (error) {
        outputChannel.appendLine("Toggle error: " + String(error));
        vscode.window.showErrorMessage("Toggle failed: " + String(error));
      }
    })
  );

  outputChannel.appendLine("Tagged JSX Tools (Web) activated");
}
