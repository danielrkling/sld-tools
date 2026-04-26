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
      begin: "(?i)(\\w+\([^)]*\))\.(" + escapeRegex(tag) + ")(\x60)",
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
  const config = vscode.workspace.getConfiguration("tagged-jsx");
  const customTags = config.get<string[]>("customTags", ["jsx", "html"]);

  outputChannel.appendLine("Regenerating grammar for tags: " + JSON.stringify(customTags));

  const grammarContent = generateGrammar(customTags);
  const grammarPath = context.extensionPath + "/syntaxes/" + GRAMMAR_FILENAME;

  fs.writeFileSync(grammarPath, grammarContent, "utf-8");
  outputChannel.appendLine("Grammar written to: " + grammarPath);
}

async function formatDocument(
  document: vscode.TextDocument,
): Promise<vscode.TextEdit[]> {
  const text = document.getText();
  const filename = document.uri.fsPath;
  let result = text;

  try {
    const prettierModule = await new Function('return import("prettier")')();
    const prettier = prettierModule.default || prettierModule;
    
    const pluginModule = await new Function('return import("prettier-plugin")')();
    const plugin = pluginModule.default || pluginModule;
    
    const embedPluginModule = await new Function('return import("prettier-plugin-embed")')();
    const embedPlugin = embedPluginModule.default || embedPluginModule;

    outputChannel.appendLine(`Formatting with Prettier... Plugin loaded with keys: ${Object.keys(plugin).join(", ")}`);

    const isTypescript = filename.endsWith(".ts") || filename.endsWith(".tsx");
    const parser = isTypescript ? "typescript" : "babel";

    result = await prettier.format(text, {
      filepath: filename,
      parser,
      plugins: [embedPlugin, plugin],
      semi: true,
      singleQuote: true,
      trailingComma: "es5",
    });
  } catch (error) {
    outputChannel.appendLine("Formatting error: " + String(error));
    return [];
  }

  if (result === text) {
    return [];
  }

  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(document.lineCount, 0),
  );

  return [new vscode.TextEdit(fullRange, result)];
}

class TaggedJsxFormatter implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken,
  ): Promise<vscode.TextEdit[]> {
    return formatDocument(document);
  }
}

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Tagged JSX Templates");
  context.subscriptions.push(outputChannel);

  const grammarPath = context.extensionPath + "/syntaxes/" + GRAMMAR_FILENAME;

  if (!fs.existsSync(grammarPath)) {
    await regenerateGrammar(context);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("tagged-jsx.regenerateGrammar", async () => {
      await regenerateGrammar(context);
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("tagged-jsx.customTags")) {
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
    vscode.commands.registerCommand("tagged-jsx.convertToJsx", async (uri?: vscode.Uri) => {
      const document = uri
        ? await vscode.workspace.openTextDocument(uri)
        : vscode.window.activeTextEditor?.document;

      if (!document) return;

      const text = document.getText();
      const result = (await import("transform-tagged-jsx")).toJsxWithMappings(text).code;

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
    vscode.commands.registerCommand("tagged-jsx.convertToTagged", async (uri?: vscode.Uri) => {
      const { toTagged } = await import("transform-tagged-jsx");
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
    vscode.commands.registerCommand("tagged-jsx.toggle", async () => {
      const { toJsx, toTagged } = await import("transform-tagged-jsx");
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

  const formatter = new TaggedJsxFormatter();
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      [
        { scheme: "file" },
        { scheme: "untitled" },
      ],
      formatter
    )
  );
}

export async function deactivate(): Promise<void> {}