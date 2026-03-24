import {
  AttributeToken,
  CLOSE_TAG_TOKEN,
  EQUALS_TOKEN,
  EqualsToken,
  EXPRESSION_TOKEN,
  ExpressionToken,
  IDENTIFIER_TOKEN,
  OPEN_TAG_TOKEN,
  QUOTE_CHAR_TOKEN,
  SLASH_TOKEN,
  SPREAD_TOKEN,
  SpreadToken,
  TEXT_TOKEN,
  Token,
  OpenTagToken,
  CloseTagToken,
  SlashToken,
  IdentifierToken,
  TextToken,
  QuoteToken,
} from "./tokenize";
import { isComponentNode } from "./util";

// Node type constants
export const ROOT_NODE = 0;
export const ELEMENT_NODE = 1;
export const TEXT_NODE = 2;
export const EXPRESSION_NODE = 3;
export const COMPONENT_NODE = 5;

// Prop type constants
export const BOOLEAN_PROP = 0;
export const STRING_PROP = 1;
export const EXPRESSION_PROP = 2;
export const SPREAD_PROP = 3;

export type NodeType =
  | typeof ROOT_NODE
  | typeof ELEMENT_NODE
  | typeof TEXT_NODE
  | typeof EXPRESSION_NODE;
export type PropType =
  | typeof BOOLEAN_PROP
  | typeof STRING_PROP
  | typeof EXPRESSION_PROP
  | typeof SPREAD_PROP;

export type ChildNode = ElementNode | TextNode | ExpressionNode;

export interface RootNode {
  type: typeof ROOT_NODE;
  children: ChildNode[];
}

export interface ElementNode {
  type: typeof ELEMENT_NODE | typeof COMPONENT_NODE;
  name: string | number;
  props: PropNode[];
  children: ChildNode[];
  tokens: {
    openTag: {
      open: OpenTagToken;
      name: IdentifierToken;
      slash?: SlashToken;
      close?: CloseTagToken;
    };
    closeTag?: {
      open: OpenTagToken;
      slash: SlashToken;
      name: IdentifierToken;
      close: CloseTagToken;
    };
  };
}

export interface TextNode {
  type: typeof TEXT_NODE;
  value: string;
  tokens: {
    text: TextToken;
  };
}

export interface ExpressionNode {
  type: typeof EXPRESSION_NODE;
  value: number;
  tokens: {
    expression: ExpressionToken;
  };
}

export interface BooleanProp {
  name: string;
  type: typeof BOOLEAN_PROP;
  value: boolean;
  tokens: {
    name: IdentifierToken;
  };
}

export interface StringProp {
  name: string;
  type: typeof STRING_PROP;
  value: string;
  quote?: "'" | '"';
  tokens: {
    name: IdentifierToken;
    equals: EqualsToken;
    openQuote?: QuoteToken;
    valueTokens?: AttributeToken[];
    closeQuote?: QuoteToken;
  };
}

export interface ExpressionProp {
  name: string;
  type: typeof EXPRESSION_PROP;
  value: number;
  quote?: "'" | '"';
  tokens:{
      name: IdentifierToken;
      equals: EqualsToken;
      expression: ExpressionToken;
      openQuote?: QuoteToken;
      closeQuote?: QuoteToken;
  }
}

export interface SpreadProp {
  type: typeof SPREAD_PROP;
  value: number;
  tokens: {
    spread: SpreadToken;
    expression: ExpressionToken;
  };
}

export type PropNode =
  | BooleanProp
  | StringProp
  | ExpressionProp
  | SpreadProp;

export const parse = (
  tokens: Token[],
  interpolationStrings?: string[],
): RootNode => {
  const root: RootNode = { type: ROOT_NODE, children: [] };
  const stack: (RootNode | ElementNode)[] = [root];
  let pos = 0;
  const len = tokens.length;

  while (pos < len) {
    const token = tokens[pos];
    const parent = stack[stack.length - 1];

    switch (token.type) {
      case TEXT_TOKEN: {
        // --- TEXT ---
        const value = token.value;
        if (value.trim() === "") {
          const prevType = tokens[pos - 1]?.type;
          const nextType = tokens[pos + 1]?.type;
          // Filter out empty text nodes between tags
          if (prevType === CLOSE_TAG_TOKEN || nextType === OPEN_TAG_TOKEN) {
            pos++;
            continue;
          }
        }
        parent.children.push({ type: TEXT_NODE, value, tokens: { text: token } });
        pos++;
        continue;
      }

      case EXPRESSION_TOKEN: {
        // --- EXPRESSION ---
        parent.children.push({
          type: EXPRESSION_NODE,
          value: token.value,
          tokens: { expression: token },
        });
        pos++;
        continue;
      }

      case OPEN_TAG_TOKEN: {
        // --- TAG ---
        pos++; // Consume '<'
        const nextToken = tokens[pos];

        // Handle Closing Tag: </name>
        if (nextToken.type === SLASH_TOKEN) {
          pos++; // Consume '/'
          const nameToken = tokens[pos];
          if (
            stack.length > 1 &&
            nameToken?.type === IDENTIFIER_TOKEN &&
            (stack[stack.length - 1] as ElementNode).name === nameToken.value
          ) {
            stack.pop();
            pos += 2; // Consume 'name' and '>'
            continue;
          }
          throw new Error("Mismatched closing tag.");
        }

        // Handle Opening Tag: <name ...>
        if (nextToken.type === IDENTIFIER_TOKEN) {
          const tagName = nextToken.value;
          const node = {
            type: isComponentNode(tagName) ? COMPONENT_NODE : ELEMENT_NODE,
            name: tagName,
            props: [],
            children: [],
            tokens: {
              openTag: {
                open: token,
                name: nextToken,
              },
            },
          } as ElementNode;
          parent.children.push(node);
          pos++; // Consume tag name

          // --- Attribute Parsing Loop ---
          while (pos < len) {
            const attrToken = tokens[pos];
            if (
              attrToken.type === CLOSE_TAG_TOKEN ||
              attrToken.type === SLASH_TOKEN
            ) {
              break; // End of attributes
            }

            if (attrToken.type === SPREAD_TOKEN) {
              const expr = tokens[pos + 1];
              if (expr?.type === EXPRESSION_TOKEN) {
                node.props.push({
                  type: SPREAD_PROP,
                  value: expr.value,
                  tokens: {
                    spread: attrToken,
                    expression: expr,
                  },
                });
                pos += 2; // Consume '...' and expression
              } else {
                throw new Error(
                  "Spread operator must be followed by an expression.",
                );
              }
            } else if (attrToken.type === IDENTIFIER_TOKEN) {
              const name = attrToken.value;
              const next = tokens[pos + 1];

              if (next?.type === EQUALS_TOKEN) {
                const equalsToken = next; // Store reference to equals token
                pos += 2; // Consume name and '='
                const valToken = tokens[pos];
                if (valToken.type === EXPRESSION_TOKEN) {
                  node.props.push({
                    name,
                    type: EXPRESSION_PROP,
                    value: valToken.value,
                    quote: undefined,
                    tokens: {
                      name: attrToken,
                      equals: equalsToken,
                      expression: valToken,
                    },
                  });
                  pos++;
                } else if (valToken.type === QUOTE_CHAR_TOKEN) {
                  const quote = valToken.value;
                  const openQuote = valToken;
                  pos++; // Consume opening quote
                  const parts: (string | number)[] = [];
                  const valueTokens: (AttributeToken | ExpressionToken)[] = [];
                  while (pos < len && tokens[pos].type !== QUOTE_CHAR_TOKEN) {
                    const part = tokens[pos++] as
                      | ExpressionToken
                      | AttributeToken;
                    if (part.value !== "") parts.push(part.value);
                    valueTokens.push(part);
                  }
                  const closeQuote = tokens[pos] as QuoteToken;
                  pos++; // Consume closing quote

                  if (parts.length === 0) {
                    const prop = {
                      name,
                      type: STRING_PROP as any,
                      value: "",
                      quote,
                      tokens: {
                        name: attrToken,
                        equals: equalsToken,
                        openQuote,
                        closeQuote,
                      },
                    };
                    node.props.push(prop);
                  } else if (parts.length === 1) {
                    const v = parts[0];
                    if (typeof v === "string") {
                      const prop = {
                        name,
                        type: STRING_PROP as any,
                        value: v,
                        quote,
                        tokens: {
                          name: attrToken,
                          equals: equalsToken,
                          openQuote,
                          valueTokens: valueTokens as AttributeToken[],
                          closeQuote,
                        },
                      };
                      node.props.push(prop);
                    } else {
                      const prop = {
                        name,
                        type: EXPRESSION_PROP as any,
                        value: v,
                        quote,
                        tokens: {
                          name: attrToken,
                          equals: equalsToken,
                          expression: valueTokens[0] as ExpressionToken,
                        },
                      };
                      node.props.push(prop);
                    }
                  } else {
                    throw new Error(
                      "Mixed attribute values are not supported. Use either a static string or an expression.",
                    );
                  }
                }
              } else {
                // Boolean prop
                node.props.push({
                  type: BOOLEAN_PROP,
                  name,
                  value: true,
                  tokens: {
                    name: attrToken,
                  },
                });
                pos++;
              }
            } else {
              throw new Error("Invalid attribute.");
            }
          }

          // --- Tag Closing Logic ---
          const endToken = tokens[pos];
          if (endToken.type === SLASH_TOKEN) {
            // Self-closing: <div/>
            node.tokens.openTag.slash = endToken;
            node.tokens.openTag.close = tokens[pos + 1] as CloseTagToken;
            pos += 2; // Consume '/' and '>'
          } else if (endToken.type === CLOSE_TAG_TOKEN) {
            // Opening: <div>
            node.tokens.openTag.close = endToken;
            pos++; // Consume '>'
            stack.push(node);
          }
          continue;
        } else {
          throw new Error(
            `Expected identifier after opening tag, got: ${nextToken.type}`,
          );
        }
      }

      default:
        throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
    }
  }

  if (stack.length > 1) {
    throw new Error("Unclosed tag found.");
  }

  return root;
};
