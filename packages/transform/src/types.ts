import type * as ts from "typescript";
import type { ExpressionProp, ExpressionNode } from "@tagged-jsx/parse";

export interface ToTaggedCallbackOptions {
  expression: ts.Expression;
  propName?: string;
  propType: "attribute" | "child";
  sourceCode: string;
}

export interface ToJsxCallbackOptions {
  expression: ts.Expression;
  propName?: string;
  propType: "attribute" | "child";
  templateNode: ExpressionProp | ExpressionNode;
  sourceCode: string;
}

export interface TransformerCallbacks {
  toTagged?: (opts: ToTaggedCallbackOptions) => string;
  toJSX?: (opts: ToJsxCallbackOptions) => string;
}
