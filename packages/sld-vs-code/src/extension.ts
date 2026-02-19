import vscode from "vscode";
import * as ts from "typescript";

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
    vscode.commands.registerCommand("sld-tools.convertToJsx", async (uri: vscode.Uri, range: vscode.Range) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      const sldMatches = findSldTemplates(text);
      
      for (const match of sldMatches) {
        if (range.start.isBeforeOrEqual(document.positionAt(match.end)) && 
            range.end.isAfterOrEqual(document.positionAt(match.start))) {
          const jsxCode = convertSldToJsx(text, match.start, match.end);
          const edit = new vscode.TextEdit(range, jsxCode);
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
          break;
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sld-tools.convertToSld", async (uri: vscode.Uri, range: vscode.Range) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      const jsxMatches = findJsxElements(text);
      
      for (const match of jsxMatches) {
        if (range.start.isBeforeOrEqual(document.positionAt(match.end)) && 
            range.end.isAfterOrEqual(document.positionAt(match.start))) {
          const sldCode = convertJsxToSld(text, match.start, match.end);
          const edit = new vscode.TextEdit(range, sldCode);
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
          break;
        }
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

    const codeActions: vscode.CodeAction[] = [];

    const sldMatches = findSldTemplates(text);
    const cursorInSld = sldMatches.some(m => offset >= m.start && offset <= m.end);
    
    if (cursorInSld) {
      for (const match of sldMatches) {
        if (offset >= match.start && offset <= match.end) {
          const codeAction = new vscode.CodeAction(
            "Convert SLD to JSX",
            vscode.CodeActionKind.Refactor
          );
          codeAction.command = {
            command: "sld-tools.convertToJsx",
            title: "Convert SLD to JSX",
            arguments: [document.uri, new vscode.Range(
              document.positionAt(match.start),
              document.positionAt(match.end)
            )]
          };
          codeActions.push(codeAction);
          break;
        }
      }
    } else {
      const jsxMatches = findJsxElements(text);
      for (const match of jsxMatches) {
        if (offset >= match.start && offset <= match.end) {
          const codeAction = new vscode.CodeAction(
            "Convert JSX to SLD",
            vscode.CodeActionKind.Refactor
          );
          codeAction.command = {
            command: "sld-tools.convertToSld",
            title: "Convert JSX to SLD",
            arguments: [document.uri, new vscode.Range(
              document.positionAt(match.start),
              document.positionAt(match.end)
            )]
          };
          codeActions.push(codeAction);
          break;
        }
      }
    }

    return codeActions;
  }
}

interface Match {
  start: number;
  end: number;
}

function findSldTemplates(text: string): Match[] {
  const matches: Match[] = [];
  const regex = /sld`[^`]*`/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    matches.push({ start, end });
  }
  return matches;
}

function findJsxElements(text: string): Match[] {
  const matches: Match[] = [];
  
  const selfClosingRegex = /<([A-Z][a-zA-Z0-9]*)\s*[^>]*\/?>/g;
  let match;
  while ((match = selfClosingRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    matches.push({ start, end });
  }

  const openCloseRegex = /<([A-Z][a-zA-Z0-9]*)\s*[^>]*>[\s\S]*?<\/\1>/g;
  while ((match = openCloseRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    matches.push({ start, end });
  }

  return matches;
}

function getNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
  function visit(node: ts.Node): ts.Node | undefined {
    if (position >= node.getStart(sourceFile) && position <= node.getEnd()) {
      const child = ts.forEachChild(node, visit);
      return child ?? node;
    }
    return undefined;
  }
  return visit(sourceFile);
}

function convertSldToJsx(text: string, start: number, end: number): string {
  const sourceFile = ts.createSourceFile("test.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const node = getNodeAtPosition(sourceFile, start);
  if (node && ts.isTaggedTemplateExpression(node)) {
    const template = node.template;
    if (ts.isNoSubstitutionTemplateLiteral(template)) {
      return template.text;
    } else if (ts.isTemplateExpression(template)) {
      let jsx = template.head.text;
      for (const span of template.templateSpans) {
        jsx += `{${span.expression.getText(sourceFile)}}${span.literal.text}`;
      }
      return jsx;
    }
  }
  return "<div>// conversion failed</div>";
}

function convertJsxToSld(text: string, start: number, end: number): string {
  const jsxText = text.slice(start, end);
  return `sld\`${jsxText}\``;
}

export async function deactivate(): Promise<void> {}