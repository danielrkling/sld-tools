import vscode from "vscode";
import * as ts from "typescript";
import { sldToJsx as transformSldToJsx, jsxToSld as transformJsxToSld } from "transform-jsx";

const CONFIG_KEY = "sld-tools.preferredTag";
const DEFAULT_TAG = "jsx";

function getPreferredTag(): string {
  return vscode.workspace.getConfiguration().get<string>(CONFIG_KEY, DEFAULT_TAG);
}

function findTaggedTemplates(text: string, tag: string): { start: number; end: number }[] {
  const matches: { start: number; end: number }[] = [];
  const regex = new RegExp(`${tag}\`[\s\S]*?\``, 'g');
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length });
  }
  return matches;
}

function findJsxElements(text: string): { start: number; end: number }[] {
  const matches: { start: number; end: number }[] = [];
  
  const selfClosingRegex = /<([A-Z][a-zA-Z0-9]*)\s*[^>]*\/?>/g;
  let match;
  while ((match = selfClosingRegex.exec(text)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length });
  }

  const openCloseRegex = /<([A-Z][a-zA-Z0-9]*)\s*[^>]*>[\s\S]*?<\/\1>/g;
  while ((match = openCloseRegex.exec(text)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length });
  }

  return matches;
}

export async function activate(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = [
    { scheme: "file", language: "typescript" },
    { scheme: "file", language: "typescriptreact" },
    { scheme: "file", language: "javascript" },
    { scheme: "file", language: "javascriptreact" },
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(selector, new SldCodeActionProvider(), {
      providedCodeActionKinds: [vscode.CodeActionKind.Refactor]
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sld-tools.convertToJsx", async (uri: vscode.Uri, vsRange: vscode.Range) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      const tag = getPreferredTag();
      
      const jsxCode = transformSldToJsx(text, { tags: [tag] });
      
      if (jsxCode !== text) {
        const edit = new vscode.TextEdit(vsRange, jsxCode);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sld-tools.convertToSld", async (uri: vscode.Uri, vsRange: vscode.Range) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      const tag = getPreferredTag();
      
      const sldCode = transformJsxToSld(text, { tag });
      
      if (sldCode !== text) {
        const edit = new vscode.TextEdit(vsRange, sldCode);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);
      }
    })
  );
}

class SldCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const text = document.getText();
    const offset = document.offsetAt(range.start);
    const tag = getPreferredTag();

    const templateMatches = findTaggedTemplates(text, tag);
    const cursorInTemplate = templateMatches.some(m => offset >= m.start && offset <= m.end);
    
    if (cursorInTemplate) {
      for (const match of templateMatches) {
        if (offset >= match.start && offset <= match.end) {
          const codeAction = new vscode.CodeAction(
            `Convert ${tag} to JSX`,
            vscode.CodeActionKind.Refactor
          );
          codeAction.command = {
            command: "sld-tools.convertToJsx",
            title: `Convert ${tag} to JSX`,
            arguments: [document.uri, new vscode.Range(
              document.positionAt(match.start),
              document.positionAt(match.end)
            )]
          };
          return [codeAction];
        }
      }
    } else {
      const jsxMatches = findJsxElements(text);
      for (const match of jsxMatches) {
        if (offset >= match.start && offset <= match.end) {
          const codeAction = new vscode.CodeAction(
            `Convert JSX to ${tag}`,
            vscode.CodeActionKind.Refactor
          );
          codeAction.command = {
            command: "sld-tools.convertToSld",
            title: `Convert JSX to ${tag}`,
            arguments: [document.uri, new vscode.Range(
              document.positionAt(match.start),
              document.positionAt(match.end)
            )]
          };
          return [codeAction];
        }
      }
    }

    return [];
  }
}

export async function deactivate(): Promise<void> {}
