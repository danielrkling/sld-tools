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
export const COMPONENT_NODE = 2;
export const TEXT_NODE = 3;
export const EXPRESSION_NODE = 4;

// Prop type constants
export const BOOLEAN_PROP = 0;
export const STATIC_PROP = 1;
export const EXPRESSION_PROP = 2;
export const SPREAD_PROP = 3;
export const MIXED_PROP = 4;

export type NodeType =
  | typeof ROOT_NODE
  | typeof ELEMENT_NODE
  | typeof COMPONENT_NODE
  | typeof TEXT_NODE
  | typeof EXPRESSION_NODE;
export type PropType =
  | typeof BOOLEAN_PROP
  | typeof STATIC_PROP
  | typeof EXPRESSION_PROP
  | typeof SPREAD_PROP
  | typeof MIXED_PROP;

export type ChildNode = ElementNode | TextNode | ExpressionNode | ComponentNode;

export interface RootNode {
  type: typeof ROOT_NODE;
  children: ChildNode[];
  template?: HTMLTemplateElement;
}

export interface ElementNode {
  type: typeof ELEMENT_NODE;
  name: string;
  props: PropNode[];
  children: ChildNode[];
  open: OpenTagToken;
  nameToken?: IdentifierToken;
  close?: CloseTagToken;
  slash?: SlashToken;
}

export interface ComponentNode {
  type: typeof COMPONENT_NODE;
  name: string;
  props: PropNode[];
  children: ChildNode[];
  template?: HTMLTemplateElement;
  open: OpenTagToken;
  nameToken: IdentifierToken;
  close?: CloseTagToken;
  slash?: SlashToken;
}

export interface TextNode {
  type: typeof TEXT_NODE;
  value: string;
  text: TextToken;
}

export interface ExpressionNode {
  type: typeof EXPRESSION_NODE;
  value: number;
  expression: ExpressionToken;
}

export interface BooleanProp {
  name: string;
  type: typeof BOOLEAN_PROP;
  value: boolean;
  nameToken: IdentifierToken;
}

export interface StaticProp {
  name: string;
  type: typeof STATIC_PROP;
  value: string;
  quote?: "'" | '"';
  nameToken: IdentifierToken;
  equalsToken?: EqualsToken;
  openQuote?: QuoteToken;
  valueTokens?: AttributeToken[];
  closeQuote?: QuoteToken;
}

export interface ExpressionProp {
  name: string;
  type: typeof EXPRESSION_PROP;
  value: number;
  quote?: "'" | '"';
  nameToken: IdentifierToken;
  equalsToken: EqualsToken;
  expressionToken: ExpressionToken;
}

export interface SpreadProp {
  type: typeof SPREAD_PROP;
  value: number;
  spreadToken: SpreadToken;
  expressionToken: ExpressionToken;
}

export interface MixedProp {
  name: string;
  type: typeof MIXED_PROP;
  value: Array<string | number>;
  quote: "'" | '"';
  nameToken: IdentifierToken;
  equalsToken: EqualsToken;
  openQuote: QuoteToken;
  valueTokens: (AttributeToken | ExpressionToken)[];
  closeQuote: QuoteToken;
}

export type PropNode = BooleanProp | StaticProp | ExpressionProp | SpreadProp | MixedProp;

export const parse = (tokens: Token[], voidElements: Set<string>, interpolationStrings?: string[]): RootNode => {
  const root: RootNode = { type: ROOT_NODE, children: [] };
  const stack: (RootNode | ElementNode | ComponentNode)[] = [root];
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
        parent.children.push({ type: TEXT_NODE, value, text: token });
        pos++;
        continue;
      }

      case EXPRESSION_TOKEN: {
        // --- EXPRESSION ---
        parent.children.push({ type: EXPRESSION_NODE, value: token.value, expression: token });
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
            const node = stack.pop();
            if (node?.type === ELEMENT_NODE && voidElements.has(node.name)) {
              node.children = [];
            }
            pos += 2; // Consume 'name' and '>'
            continue;
          }
          throw new Error("Mismatched closing tag.");
        }

        // Handle Opening Tag: <name ...>
        if (nextToken.type === IDENTIFIER_TOKEN) {
          const tagName = nextToken.value;
          const node: ElementNode | ComponentNode = {
            type: isComponentNode(tagName) ? COMPONENT_NODE : ELEMENT_NODE,
            name: tagName,
            props: [],
            children: [],
            open: token,
            nameToken: nextToken,
          };
          parent.children.push(node);
          pos++; // Consume tag name

          // --- Attribute Parsing Loop ---
          while (pos < len) {
            const attrToken = tokens[pos];
            if (attrToken.type === CLOSE_TAG_TOKEN || attrToken.type === SLASH_TOKEN) {
              break; // End of attributes
            }

            if (attrToken.type === SPREAD_TOKEN) {
              const expr = tokens[pos + 1];
              if (expr?.type === EXPRESSION_TOKEN) {
                node.props.push({ type: SPREAD_PROP, value: expr.value, spreadToken: attrToken, expressionToken: expr });
                pos += 2; // Consume '...' and expression
              } else {
                throw new Error("Spread operator must be followed by an expression.");
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
                    nameToken: attrToken,
                    equalsToken: equalsToken,
                    expressionToken: valToken
                  });
                  pos++;
                } else if (valToken.type === QUOTE_CHAR_TOKEN) {
                  const quote = valToken.value;
                  const openQuote = valToken;
                  pos++; // Consume opening quote
                  const parts: (string | number)[] = [];
                  const valueTokens: (AttributeToken | ExpressionToken)[] = [];
                  while (pos < len && tokens[pos].type !== QUOTE_CHAR_TOKEN) {
                    const part = tokens[pos++] as ExpressionToken | AttributeToken;
                    if (part.value !== "") parts.push(part.value);
                    valueTokens.push(part);
                  }
                  const closeQuote = tokens[pos] as QuoteToken;
                  pos++; // Consume closing quote

                  if (parts.length === 0) {
                    const prop = { 
                      name, 
                      type: STATIC_PROP as any, 
                      value: "", 
                      quote, 
                      nameToken: attrToken,
                      equalsToken: equalsToken,
                      openQuote,
                      closeQuote
                    };
                    node.props.push(prop);
                  } else if (parts.length === 1) {
                    const v = parts[0];
                    if (typeof v === "string") {
                      const prop = {
                        name,
                        type: STATIC_PROP as any,
                        value: v,
                        quote,
                        nameToken: attrToken,
                        equalsToken: equalsToken,
                        openQuote,
                        valueTokens: valueTokens as AttributeToken[],
                        closeQuote,
                      };
                      node.props.push(prop);
                    } else {
                      const prop = {
                        name,
                        type: EXPRESSION_PROP as any,
                        value: v,
                        quote,
                        nameToken: attrToken,
                        equalsToken: equalsToken,
                        expressionToken: valueTokens[0] as ExpressionToken,
                      };
                      node.props.push(prop);
                    }
                  } else {
                    const prop = { 
                      name, 
                      type: MIXED_PROP as any, 
                      value: parts, 
                      quote, 
                      nameToken: attrToken,
                      equalsToken: equalsToken,
                      openQuote,
                      valueTokens,
                      closeQuote,
                    };
                    node.props.push(prop);
                  }
                }
              } else {
                // Boolean prop
                node.props.push({ type: BOOLEAN_PROP, name, value: true, nameToken: attrToken });
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
            node.slash = endToken;
            node.close = tokens[pos + 1] as CloseTagToken;
            pos += 2; // Consume '/' and '>'
          } else if (endToken.type === CLOSE_TAG_TOKEN) {
            // Opening: <div>
            node.close = endToken;
            pos++; // Consume '>'
            stack.push(node);
          }
          continue;
        } else {
          throw new Error(`Expected identifier after opening tag, got: ${nextToken.type}`);
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
