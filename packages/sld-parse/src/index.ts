import { tokenize, Token, OPEN_TAG_TOKEN, CLOSE_TAG_TOKEN, SLASH_TOKEN, IDENTIFIER_TOKEN, EQUALS_TOKEN, ATTRIBUTE_VALUE_TOKEN, TEXT_TOKEN, EXPRESSION_TOKEN, QUOTE_CHAR_TOKEN, SPREAD_TOKEN } from "./tokenize";

export const enum INodeType {
  Root,
  Text,
  Comment,
  Insert,
  Element,
  Name,
  Open,
  Close,
  BooleanProperty,
  StringProperty,
  DynamicProperty,
  MixedProperty,
}

export type IRoot = {
  type: INodeType.Root;
  children: IChild[];
  start: number;
  end: number;
};

export type IText = {
  type: INodeType.Text;
  value: string;
  start: number;
  end: number;
};

export type IComment = {
  type: INodeType.Comment;
  value: string;
  start: number;
  end: number;
};

export type IInsert = {
  type: INodeType.Insert;
  index: number;
  start: number;
  end: number;
};

export type IElement = {
  type: INodeType.Element;
  props: IProperty[];
  children: IChild[];
  name: IName;
  open: IOpen;
  close?: IClose;
  start: number;
  end: number;
  selfClosing: boolean;
};

export type IName = {
  type: INodeType.Name;
  value: string;
  start: number;
  end: number;
};

export type IOpen = {
  type: INodeType.Open;
  start: number;
  end: number;
};

export type IClose = {
  type: INodeType.Close;
  start: number;
  end: number;
};

export type IChild = IText | IElement | IInsert | IComment;

export type IProperty =
  | BooleanProperty
  | StringProperty
  | DynamicProperty
  | MixedProperty;

export type BooleanProperty = {
  type: INodeType.BooleanProperty;
  value: true;
  name: IName;
  start: number;
  end: number;
};

export type StringProperty = {
  type: INodeType.StringProperty;
  name: IName;
  quote: "'" | '"' | "";
  value: string;
  start: number;
  end: number;
};

export type DynamicProperty = {
  type: INodeType.DynamicProperty;
  quote: "'" | '"' | "";
  name: IName;
  valueIndex: number;
  start: number;
  end: number;
};

export type MixedProperty = {
  type: INodeType.MixedProperty;
  name: IName;
  quote: "'" | '"';
  values: (string | number)[];
  start: number;
  end: number;
};

function isOpenTagToken(token: Token): token is { type: typeof OPEN_TAG_TOKEN; start: number; end: number } {
  return token.type === OPEN_TAG_TOKEN;
}

function isCloseTagToken(token: Token): token is { type: typeof CLOSE_TAG_TOKEN; start: number; end: number } {
  return token.type === CLOSE_TAG_TOKEN;
}

function isSlashToken(token: Token): token is { type: typeof SLASH_TOKEN; start: number; end: number } {
  return token.type === SLASH_TOKEN;
}

function isIdentifierToken(token: Token): token is { type: typeof IDENTIFIER_TOKEN; value: string; start: number; end: number } {
  return token.type === IDENTIFIER_TOKEN;
}

function isTextToken(token: Token): token is { type: typeof TEXT_TOKEN; value: string; start: number; end: number } {
  return token.type === TEXT_TOKEN;
}

function isExpressionToken(token: Token): token is { type: typeof EXPRESSION_TOKEN; value: number; start: number; end: number } {
  return token.type === EXPRESSION_TOKEN;
}

function isQuoteToken(token: Token): token is { type: typeof QUOTE_CHAR_TOKEN; value: "'" | '"'; start: number; end: number } {
  return token.type === QUOTE_CHAR_TOKEN;
}

function isAttrValueToken(token: Token): token is { type: typeof ATTRIBUTE_VALUE_TOKEN; value: string; start: number; end: number } {
  return token.type === ATTRIBUTE_VALUE_TOKEN;
}

function isEqualsToken(token: Token): token is { type: typeof EQUALS_TOKEN; start: number; end: number } {
  return token.type === EQUALS_TOKEN;
}

function isSpreadToken(token: Token): token is { type: typeof SPREAD_TOKEN; start: number; end: number } {
  return token.type === SPREAD_TOKEN;
}

export function parse<T = any>(
  templates: TemplateStringsArray,
  ...values: T[]
): IRoot {
  const rawTextElements = new Set<string>();
  const expressionLengths = values.map(v => v == null ? 0 : String(v).length);
  const tokens = tokenize(Array.from(templates), rawTextElements, expressionLengths);
  
  const root: IRoot = {
    type: INodeType.Root,
    children: [],
    start: 0,
    end: 0,
  };

  const parents: (IRoot | IElement)[] = [root];
  let currentElement: IElement | null = null;
  let currentPropName: IName | null = null;
  let currentPropQuote: "'" | '"' | "" = "";
  let currentPropStart = 0;
  let currentPropValue: (string | number)[] = [];
  let sawEquals = false;
  let inTag = false;
  let tagName = "";
  let afterOpenTag = false;
  let selfClosing = false;
  let commentBuffer = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const parent = parents[parents.length - 1];

    if (isTextToken(token)) {
      if (inTag && commentBuffer) {
        commentBuffer += token.value;
      } else if (inTag) {
        // Text inside tags - ignore whitespace
      } else {
        parent.children.push({
          type: INodeType.Text,
          value: token.value,
          start: token.start,
          end: token.end,
        });
      }
      continue;
    }

    if (isExpressionToken(token)) {
      parent.children.push({
        type: INodeType.Insert,
        index: token.value,
        start: token.start,
        end: token.end,
      });
      continue;
    }

    if (inTag) continue;

    if (isOpenTagToken(token)) {
      inTag = true;
      afterOpenTag = true;
      currentElement = null;
      sawEquals = false;
      currentPropName = null;
      currentPropValue = [];
      continue;
    }

    if (isIdentifierToken(token)) {
      if (afterOpenTag) {
        tagName = token.value;
        currentElement = {
          type: INodeType.Element,
          name: {
            type: INodeType.Name,
            value: token.value,
            start: token.start,
            end: token.end,
          },
          props: [],
          children: [],
          open: {
            type: INodeType.Open,
            start: token.start,
            end: token.end,
          },
          start: token.start,
          end: token.end,
          selfClosing: false,
        };
        parent.children.push(currentElement);
      } else if (inTag && currentElement) {
        currentPropName = {
          type: INodeType.Name,
          value: token.value,
          start: token.start,
          end: token.end,
        };
        currentPropQuote = "";
        currentPropValue = [];
        sawEquals = false;
      }
      continue;
    }

    if (isSlashToken(token)) {
      const nextToken = tokens[i + 1];
      if (isCloseTagToken(nextToken) && currentElement) {
        selfClosing = true;
      }
      continue;
    }

    if (isEqualsToken(token)) {
      sawEquals = true;
      continue;
    }

    if (isQuoteToken(token)) {
      if (!inTag) continue;
      
      if (!sawEquals && currentPropName) {
        currentElement?.props.push({
          type: INodeType.BooleanProperty,
          value: true,
          name: currentPropName,
          start: currentPropName.start,
          end: currentPropName.end,
        });
        currentPropName = null;
      }
      currentPropQuote = token.value;
      currentPropStart = token.start;
      continue;
    }

    if (isAttrValueToken(token)) {
      if (sawEquals && currentPropName) {
        const value = token.value;
        const isDynamic = /^\$\{/.test(value);
        if (isDynamic) {
          const match = value.match(/^\$\{(\d+)\}$/);
          if (match) {
            currentElement?.props.push({
              type: INodeType.DynamicProperty,
              quote: currentPropQuote,
              name: currentPropName,
              valueIndex: parseInt(match[1]),
              start: currentPropName.start,
              end: token.end,
            });
          }
        } else {
          currentElement?.props.push({
            type: INodeType.StringProperty,
            quote: currentPropQuote,
            name: currentPropName,
            value: value,
            start: currentPropName.start,
            end: token.end,
          });
        }
        currentPropName = null;
        sawEquals = false;
      } else if (currentPropName && !sawEquals) {
        currentElement?.props.push({
          type: INodeType.BooleanProperty,
          value: true,
          name: currentPropName,
          start: currentPropName.start,
          end: token.end,
        });
        currentPropName = null;
      }
      continue;
    }

    if (isCloseTagToken(token)) {
      if (commentBuffer) {
        parent.children.push({
          type: INodeType.Comment,
          value: commentBuffer,
          start: token.start - commentBuffer.length - 2,
          end: token.end,
        });
        commentBuffer = "";
      } else if (selfClosing && currentElement) {
        currentElement.close = {
          type: INodeType.Close,
          start: token.start,
          end: token.end,
        };
        currentElement.selfClosing = true;
      } else if (currentElement) {
        parents.push(currentElement);
      }
      inTag = false;
      afterOpenTag = false;
      selfClosing = false;
      continue;
    }

    if (isSpreadToken(token)) {
      if (inTag && currentElement) {
        const nextToken = tokens[i + 1];
        if (isExpressionToken(nextToken)) {
          currentElement.props.push({
            type: INodeType.DynamicProperty,
            quote: "",
            name: {
              type: INodeType.Name,
              value: "...",
              start: token.start,
              end: nextToken.end,
            },
            valueIndex: nextToken.value,
            start: token.start,
            end: nextToken.end,
          });
        }
      }
      continue;
    }
  }

  root.end = tokens.length > 0 ? tokens[tokens.length - 1].end : 0;
  return root;
}
