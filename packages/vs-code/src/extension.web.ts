import vscode from "vscode";
import {
  createJsxTransformer,
  createExpressionTransformCallbacks,
  createTaggedTransformer,
} from "@tagged-jsx/transform";
import ts from "typescript";
// import * as prettier from "prettier/standalone";
// import {
//   createPlugin,
//   createPluginWithCallbacks,
// } from "@tagged-jsx/prettier-plugin";

let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Tagged JSX Tools (Web)");
  context.subscriptions.push(outputChannel);

  function getTransformers() {
    const config = vscode.workspace.getConfiguration("tagged-jsx");
    const useCallbacks = config.get<boolean>("useCallbacks", false);
    const tags = config.get<string[]>("customTags", ["jsx", "html"]);
    const preferredTag = config.get<string>("preferredTag", "jsx");

    const toJSXTransform = createJsxTransformer(
      tags,
      ts,
      useCallbacks ? createExpressionTransformCallbacks(ts) : undefined,
    );

    const toTaggedTransform = createTaggedTransformer(
      preferredTag,
      ts,
      useCallbacks ? createExpressionTransformCallbacks(ts) : undefined,
    );

    return { toJSXTransform, toTaggedTransform };
  }

  // Register commands for web - simplified version
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tagged-jsx.regenerateGrammar",
      async () => {
        vscode.window.showInformationMessage(
          "Grammar regeneration only available in desktop version",
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tagged-jsx.convertToJsx",
      async (uri?: vscode.Uri) => {
        const document = uri
          ? await vscode.workspace.openTextDocument(uri)
          : vscode.window.activeTextEditor?.document;

        if (!document) return;

        const { toJSXTransform } = getTransformers();

        try {
          const text = document.getText();
          const result = toJSXTransform.toJsx(text);

          if (result !== text) {
            const edit = new vscode.TextEdit(
              new vscode.Range(0, 0, document.lineCount, 0),
              result,
            );
            const workspaceEdit = new vscode.WorkspaceEdit();
            workspaceEdit.set(document.uri, [edit]);
            await vscode.workspace.applyEdit(workspaceEdit);
          }
        } catch (error) {
          outputChannel.appendLine("Convert to JSX error: " + String(error));
          vscode.window.showErrorMessage(
            "Failed to convert to JSX: " + String(error),
          );
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tagged-jsx.convertToTagged",
      async (uri?: vscode.Uri) => {
        const document = uri
          ? await vscode.workspace.openTextDocument(uri)
          : vscode.window.activeTextEditor?.document;

        if (!document) return;

        const { toTaggedTransform } = getTransformers();

        try {
          const text = document.getText();
          const result = toTaggedTransform.toTagged(text);

          if (result !== text) {
            const edit = new vscode.TextEdit(
              new vscode.Range(0, 0, document.lineCount, 0),
              result,
            );
            const workspaceEdit = new vscode.WorkspaceEdit();
            workspaceEdit.set(document.uri, [edit]);
            await vscode.workspace.applyEdit(workspaceEdit);
          }
        } catch (error) {
          outputChannel.appendLine("Convert to Tagged error: " + String(error));
          vscode.window.showErrorMessage(
            "Failed to convert to Tagged: " + String(error),
          );
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tagged-jsx.toggle", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const text = document.getText();
      const config = vscode.workspace.getConfiguration("tagged-jsx");
      const tags = config.get<string[]>("customTags", ["jsx", "html"]);

      const templateRegex = new RegExp(
        `(${tags.join("|")})\`[\\s\\S]*?\``,
        "g",
      );
      const hasTemplates = templateRegex.test(text);

      try {
        const { toJSXTransform, toTaggedTransform } = getTransformers();

        let result: string;

        if (hasTemplates) {
          result = toJSXTransform.toJsx(text);
        } else {
          result = toTaggedTransform.toTagged(text);
        }

        if (result !== text) {
          const edit = new vscode.TextEdit(
            new vscode.Range(0, 0, document.lineCount, 0),
            result,
          );
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [edit]);
          await vscode.workspace.applyEdit(workspaceEdit);
        }
      } catch (error) {
        outputChannel.appendLine("Toggle error: " + String(error));
        vscode.window.showErrorMessage("Toggle failed: " + String(error));
      }
    }),
  );

  //Formatter registration - simplified for web
  // context.subscriptions.push(
  //   vscode.languages.registerDocumentFormattingEditProvider("typescript", {
  //     async provideDocumentFormattingEdits(document: vscode.TextDocument) {
  //       const text = document.getText();
  //       const config = vscode.workspace.getConfiguration("tagged-jsx");
  //       const tags = config.get<string[]>("customTags", ["jsx", "html"]);
  //       const formatted = await prettier.format(text, {
  //         parser: "typescript",
  //         plugins: [createPlugin(tags)],
  //         embeddedLanguageFormatting: "auto",
  //       });
  //       return [
  //         vscode.TextEdit.replace(
  //           new vscode.Range(0, 0, document.lineCount, 0),
  //           formatted,
  //         ),
  //       ];
  //     },
  //   }),
  // );

  outputChannel.appendLine("Tagged JSX Tools (Web) activated");
}
