import vscode from "vscode";
import * as ts from "typescript";

function findSldTemplates(text: string): { start: number; end: number }[] {
  const matches: { start: number; end: number }[] = [];
  const regex = /sld`[^`]*`/g;
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

function sldToJsx(sourceFile: ts.SourceFile, range: { start: number; end: number }): string {
  function visit(node: ts.Node): string {
    if (ts.isTaggedTemplateExpression(node)) {
      const tagName = node.tag.getText(sourceFile);
      if (/^sld$/i.test(tagName)) {
        const nodeStart = node.getStart(sourceFile);
        const nodeEnd = node.getEnd();
        
        if (nodeStart >= range.start && nodeEnd <= range.end) {
          const template = node.template;
          if (ts.isNoSubstitutionTemplateLiteral(template)) {
            const text = template.text;
            const topLevelElements = countTopLevelElements(text);
            if (topLevelElements > 1) {
              return `<>${text}</>`;
            }
            return text;
          } else if (ts.isTemplateExpression(template)) {
            let result = template.head.text;
            for (const span of template.templateSpans) {
              const exprText = span.expression.getText(sourceFile);
              result += `{${exprText}}${span.literal.text}`;
            }
            
            const topLevelElements = countTopLevelElements(result);
            if (topLevelElements > 1) {
              return `<>${result}</>`;
            }
            return result;
          }
        }
      }
    }
    let result = "";
    ts.forEachChild(node, (child) => {
      const childResult = visit(child);
      if (childResult) result = childResult;
    });
    return result;
  }
  return visit(sourceFile);
}

function countTopLevelElements(text: string): number {
  let count = 0;
  let depth = 0;
  let inTag = false;
  let tagName = "";
  let isClosing = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (!inTag && char === "<") {
      isClosing = text[i + 1] === "/";
      inTag = true;
      tagName = "";
      continue;
    }
    
    if (inTag) {
      if (char === ">") {
        if (isClosing) {
          depth--;
        } else if (!tagName.endsWith("/")) {
          depth++;
        }
        inTag = false;
        if (depth === 1 && isClosing) {
          count++;
        } else if (depth === 1 && !isClosing && !tagName.endsWith("/")) {
          count++;
        }
        continue;
      }
      
      if (tagName === "" && /[a-zA-Z]/.test(char)) {
        tagName = char;
      } else if (tagName && /[a-zA-Z0-9\-]/.test(char)) {
        tagName += char;
      }
      continue;
    }
  }
  
  return count;
}

function jsxToSld(sourceFile: ts.SourceFile, range: { start: number; end: number }): string {
  const results: string[] = [];
  
  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();
      
      if (nodeStart >= range.start && nodeEnd <= range.end) {
        const tagName = node.openingElement.tagName.getText(sourceFile);
        const attrs = renderAttributes(node.openingElement.attributes, sourceFile);
        const children = node.children.map(c => renderJsxChild(c, sourceFile)).join("");
        const isSelfClosing = node.closingElement === undefined;
        
        if (isSelfClosing) {
          results.push(`sld\`<${tagName}${attrs} />\``);
        } else {
          results.push(`sld\`<${tagName}${attrs}>${children}</${tagName}>\``);
        }
      }
    } else if (ts.isJsxSelfClosingElement(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();
      
      if (nodeStart >= range.start && nodeEnd <= range.end) {
        const tagName = node.tagName.getText(sourceFile);
        const attrs = renderAttributes(node.attributes, sourceFile);
        results.push(`sld\`<${tagName}${attrs} />\``);
      }
    }
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return results.join("\n");
}

function renderAttributes(attrs: ts.JsxAttributes, sourceFile: ts.SourceFile): string {
  const props = attrs.properties.map(prop => {
    if (ts.isJsxAttribute(prop)) {
      const name = prop.name.getText(sourceFile);
      if (prop.initializer) {
        if (ts.isJsxExpression(prop.initializer)) {
          return ` ${name}={${prop.initializer.expression?.getText(sourceFile) ?? ""}}`;
        }
        return ` ${name}="${prop.initializer.getText(sourceFile)}"`;
      }
      return ` ${name}`;
    }
    if (ts.isJsxSpreadAttribute(prop)) {
      return ` {...${prop.expression.getText(sourceFile)}}`;
    }
    return "";
  }).join("");
  return props;
}

function renderJsxChild(child: ts.JsxChild, sourceFile: ts.SourceFile): string {
  if (ts.isJsxText(child)) return child.getText(sourceFile);
  if (ts.isJsxExpression(child)) return `{${child.expression?.getText(sourceFile) ?? ""}}`;
  if (ts.isJsxElement(child)) {
    const tagName = child.openingElement.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.openingElement.attributes, sourceFile);
    const children = child.children.map(c => renderJsxChild(c, sourceFile)).join("");
    return `<${tagName}${attrs}>${children}</${tagName}>`;
  }
  if (ts.isJsxSelfClosingElement(child)) {
    const tagName = child.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.attributes, sourceFile);
    return `<${tagName}${attrs} />`;
  }
  return "";
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
    vscode.commands.registerCommand("sld-tools.convertToJsx", async (uri: vscode.Uri, range: vscode.Range) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      
      const sourceFile = ts.createSourceFile(
        uri.fsPath,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const start = document.offsetAt(range.start);
      const end = document.offsetAt(range.end);
      const jsxCode = sldToJsx(sourceFile, { start, end });
      
      if (jsxCode) {
        const edit = new vscode.TextEdit(range, jsxCode);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sld-tools.convertToSld", async (uri: vscode.Uri, range: vscode.Range) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      
      const sourceFile = ts.createSourceFile(
        uri.fsPath,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const start = document.offsetAt(range.start);
      const end = document.offsetAt(range.end);
      const sldCode = jsxToSld(sourceFile, { start, end });
      
      if (sldCode) {
        const edit = new vscode.TextEdit(range, sldCode);
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
          return [codeAction];
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
          return [codeAction];
        }
      }
    }

    return [];
  }
}

export async function deactivate(): Promise<void> {}