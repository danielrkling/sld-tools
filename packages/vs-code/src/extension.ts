import vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "sld-tools" is now active!');
}

export async function deactivate(): Promise<void> {}
