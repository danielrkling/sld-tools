import vscode from "vscode";
import * as fs from "fs";

let outputChannel: vscode.OutputChannel;

const GRAMMAR_FILENAME = "lit-jsx-generated.json";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generateGrammar(tags: string[]): string {
  const patterns: object[] = [];

  for (const tag of tags) {
    patterns.push({
      contentName: "meta.embedded.block.jsx",
      begin: "(?i)\\b(" + escapeRegex(tag) + ")(\x60)",
      beginCaptures: {
        "1": {
          name: "entity.name.function.tagged-template.js",
        },
        "2": {
          name: "punctuation.definition.string.template.begin.js",
        },
      },
      end: "\x60",
      endCaptures: {
        "0": {
          name: "punctuation.definition.string.template.end.js",
        },
      },
      patterns: [
        {
          include: "source.ts#template-substitution-element",
        },
        {
          include: "text.jsx",
        },
      ],
    });

    patterns.push({
      contentName: "meta.embedded.block.jsx",
      begin: "(?i)\\b(\\w+)\.(" + escapeRegex(tag) + ")(\x60)",
      beginCaptures: {
        "1": {
          name: "variable.js",
        },
        "2": {
          name: "entity.name.function.tagged-template.js",
        },
        "3": {
          name: "punctuation.definition.string.template.begin.js",
        },
      },
      end: "\x60",
      endCaptures: {
        "0": {
          name: "punctuation.definition.string.template.end.js",
        },
      },
      patterns: [
        {
          include: "source.ts#template-substitution-element",
        },
        {
          include: "text.jsx",
        },
      ],
    });

    patterns.push({
      contentName: "meta.embedded.block.jsx",
      begin: "(?i)(\\w+\\([^)]*\\))\.(" + escapeRegex(tag) + ")(\x60)",
      beginCaptures: {
        "1": {
          name: "entity.name.function.js",
        },
        "2": {
          name: "entity.name.function.tagged-template.js",
        },
        "3": {
          name: "punctuation.definition.string.template.begin.js",
        },
      },
      end: "\x60",
      endCaptures: {
        "0": {
          name: "punctuation.definition.string.template.end.js",
        },
      },
      patterns: [
        {
          include: "source.ts#template-substitution-element",
        },
        {
          include: "text.jsx",
        },
      ],
    });
  }

  const grammar = {
    $schema: "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
    fileTypes: [],
    injectionSelector:
      "L:source.js -comment -(string -meta.embedded), L:source.js.jsx -comment -(string -meta.embedded), L:source.jsx -comment -(string -meta.embedded), L:source.ts -comment -(string -meta.embedded), L:source.tsx -comment -(string -meta.embedded)",
    injections: {
      "L:source": {
        patterns: [
          {
            match: "<",
            name: "invalid.illegal.bad-angle-bracket.jsx",
          },
        ],
      },
    },
    patterns,
    scopeName: "text.lit-jsx",
  };

  return JSON.stringify(grammar, null, 2);
}

async function regenerateGrammar(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration("jsx-tagged");
  const customTags = config.get<string[]>("customTags", ["jsx", "sld"]);

  outputChannel.appendLine("Regenerating grammar for tags: " + JSON.stringify(customTags));

  const grammarContent = generateGrammar(customTags);
  const grammarPath = context.extensionPath + "/syntaxes/" + GRAMMAR_FILENAME;

  fs.writeFileSync(grammarPath, grammarContent, "utf-8");
  outputChannel.appendLine("Grammar written to: " + grammarPath);
}

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("JSX Tagged Templates");
  context.subscriptions.push(outputChannel);

  const grammarPath = context.extensionPath + "/syntaxes/" + GRAMMAR_FILENAME;

  if (!fs.existsSync(grammarPath)) {
    await regenerateGrammar(context);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("jsx-tagged.regenerateGrammar", async () => {
      await regenerateGrammar(context);
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("jsx-tagged.customTags")) {
        await regenerateGrammar(context);
        vscode.window.showInformationMessage(
          "Grammar regenerated. Reload window to apply changes.",
          "Reload Window"
        ).then((selection) => {
          if (selection === "Reload Window") {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
          }
        });
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("jsx-tagged.convertToJsx", async (uri?: vscode.Uri) => {
      const document = uri
        ? await vscode.workspace.openTextDocument(uri)
        : vscode.window.activeTextEditor?.document;

      if (!document) return;

      const text = document.getText();
      const result = (await import("transform-jsx")).toJsxWithMappings(text).code;

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

      const templateRegex = new RegExp(tag + "\x60[\\s\\S]*?\x60", "g");
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
}

export async function deactivate(): Promise<void> {}