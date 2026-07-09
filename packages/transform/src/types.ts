import type * as ts from "typescript";
import type { ExpressionToken } from "@tagged-jsx/parse";

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
  templateNode: ExpressionToken;
  sourceCode: string;
}

export interface TransformError {
  start: number;
  end: number;
  message: string;
}

export interface TransformerCallbacks {
  toTagged?: (opts: ToTaggedCallbackOptions) => string;
  toJSX?: (opts: ToJsxCallbackOptions) => string;
}
