import * as ts from "typescript";
import type { TransformerCallbacks } from "./types";

function isPrimitiveExpression(node: ts.Expression): boolean {
  return (
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword ||
    node.kind === ts.SyntaxKind.UndefinedKeyword
  );
}

function shouldWrapWithArrowFunction(node: ts.Expression): boolean {
  // Only wrap simple function calls like v() or identifier()
  // Don't wrap array literals, object literals, arrow functions, etc.
  if (ts.isCallExpression(node)) {
    return true;
  }
  return false;
}

function shouldSkipProp(propName?: string): boolean {
  if (!propName) return false;
  return propName === "ref" || propName.startsWith("on");
}

export function createExpressionTransformCallbacks(_ts: typeof ts): TransformerCallbacks {
  return {
    toTagged: ({ expression, propName, propType, sourceCode }) => {
      if (shouldSkipProp(propName)) {
        return sourceCode.slice(expression.getStart(), expression.getEnd());
      }

      if (isPrimitiveExpression(expression)) {
        return sourceCode.slice(expression.getStart(), expression.getEnd());
      }

      // Only wrap with () => if it's a function call or identifier
      if (!shouldWrapWithArrowFunction(expression)) {
        return sourceCode.slice(expression.getStart(), expression.getEnd());
      }

      const text = sourceCode.slice(expression.getStart(), expression.getEnd());
      return `() => ${text}`;
    },

    toJSX: ({ expression, propName, propType, sourceCode }) => {
      if (shouldSkipProp(propName)) {
        return sourceCode.slice(expression.getStart(), expression.getEnd());
      }

      if (isPrimitiveExpression(expression)) {
        return sourceCode.slice(expression.getStart(), expression.getEnd());
      }

      // Only unwrap () => if it's a simple arrow function with no params
      // AND the body looks like it was wrapped by us (simple expression)
      if (!ts.isArrowFunction(expression) || expression.parameters.length >0) {
        return sourceCode.slice(expression.getStart(), expression.getEnd());
      }

      // Don't unwrap if body is not a simple expression (e.g., block statement)
      const body = expression.body;
      if (ts.isBlock(body)) {
        return sourceCode.slice(expression.getStart(), expression.getEnd());
      }

      // Unwrap - remove the () => prefix
      const text = expression.getText();
      return text.replace(/^\(\)\s*=>\s*/, "");
    },
  };
}
