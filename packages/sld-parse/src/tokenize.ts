export const OPEN_TAG_TOKEN = 0;
export const CLOSE_TAG_TOKEN = 1;
export const SLASH_TOKEN = 2;
export const IDENTIFIER_TOKEN = 3;
export const EQUALS_TOKEN = 4;
export const ATTRIBUTE_VALUE_TOKEN = 5;
export const TEXT_TOKEN = 6;
export const EXPRESSION_TOKEN = 7;
export const QUOTE_CHAR_TOKEN = 8;
export const SPREAD_TOKEN = 9;

// Character code helpers for fast path testing (faster than regex)
const isIdentifierChar = (code: number): boolean => {
  return (
    isIdentifierStart(code) ||
    (code >= 48 && code <= 58) || // 0-9, :
    code === 46 || // .
    code === 45
  ); // -
};

const isIdentifierStart = (code: number): boolean => {
  return (
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 95 || // _
    code === 36 // $
  );
};

const isWhitespace = (code: number): boolean => {
  return (code >= 9 && code <= 13) || code === 32; // \t \n \v \f \r space
};

export interface OpenTagToken {
  type: typeof OPEN_TAG_TOKEN;
  start: number;
  end: number;
  // value: "<";
}

export interface CloseTagToken {
  type: typeof CLOSE_TAG_TOKEN;
  start: number;
  end: number;
  // value: ">";
}

export interface SlashToken {
  type: typeof SLASH_TOKEN;
  start: number;
  end: number;
  // value: "/";
}

export interface IdentifierToken {
  type: typeof IDENTIFIER_TOKEN;
  value: string;
  start: number;
  end: number;
}

export interface EqualsToken {
  type: typeof EQUALS_TOKEN;
  start: number;
  end: number;
  // value: "=";
}

export interface AttributeToken {
  type: typeof ATTRIBUTE_VALUE_TOKEN;
  value: string;
  start: number;
  end: number;
}

export interface TextToken {
  type: typeof TEXT_TOKEN;
  value: string;
  start: number;
  end: number;
}

export interface ExpressionToken {
  type: typeof EXPRESSION_TOKEN;
  value: number;
  start: number;
  end: number;
}

export interface QuoteToken {
  type: typeof QUOTE_CHAR_TOKEN;
  value: "'" | '"';
  start: number;
  end: number;
}

export interface SpreadToken {
  type: typeof SPREAD_TOKEN;
  start: number;
  end: number;
  // value: "...";
}

export interface CloseTagToken {
  type: typeof CLOSE_TAG_TOKEN;
  // value: ">";
}

export interface SlashToken {
  type: typeof SLASH_TOKEN;
  // value: "/";
}

export interface IdentifierToken {
  type: typeof IDENTIFIER_TOKEN;
  value: string;
}

export interface EqualsToken {
  type: typeof EQUALS_TOKEN;
  // value: "=";
}

export interface AttributeToken {
  type: typeof ATTRIBUTE_VALUE_TOKEN;
  value: string;
}

export interface TextToken {
  type: typeof TEXT_TOKEN;
  value: string;
}

export interface ExpressionToken {
  type: typeof EXPRESSION_TOKEN;
  value: number;
}

export interface QuoteToken {
  type: typeof QUOTE_CHAR_TOKEN;
  value: "'" | '"';
}

export interface SpreadToken {
  type: typeof SPREAD_TOKEN;
  // value: "..."
}

export type Token =
  | OpenTagToken
  | CloseTagToken
  | SlashToken
  | IdentifierToken
  | EqualsToken
  | AttributeToken
  | TextToken
  | ExpressionToken
  | QuoteToken
  | SpreadToken;

// Add a new state for elements that contain raw text only
const STATE_TEXT = 0;
const STATE_TAG = 1;
const STATE_ATTR_VALUE = 2;
const STATE_RAW_TEXT = 3;
const STATE_COMMENT = 4;

export const tokenize = (
  strings: TemplateStringsArray | string[],
  rawTextElements: Set<string>,
  interpolationStrings?: string[],
): Token[] => {
  const tokens: Token[] = [];
  let state = STATE_TEXT;
  let quoteChar: '"' | "'" | "" = "";
  let lastTagName = "";
  let globalPosition = 0;

  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];
    const len = str.length;
    let cursor = 0;

    while (cursor < len) {
      switch (state) {
        case STATE_TEXT: {
          lastTagName = "";
          const nextTag = str.indexOf("<", cursor);
          if (nextTag === -1) {
            if (cursor < len) {
              const tokenStart = globalPosition + cursor;
              const tokenEnd = globalPosition + len;
              tokens.push({ type: TEXT_TOKEN, value: str.slice(cursor), start: tokenStart, end: tokenEnd });
            }
            cursor = len;
          } else {
            if (nextTag > cursor) {
              const tokenStart = globalPosition + cursor;
              const tokenEnd = globalPosition + nextTag;
              tokens.push({
                type: TEXT_TOKEN,
                value: str.slice(cursor, nextTag),
                start: tokenStart,
                end: tokenEnd,
              });
            }

            if (str[nextTag + 1] === "!" && str[nextTag + 2] === "-" && str[nextTag + 3] === "-") {
              state = STATE_COMMENT;
              cursor = nextTag + 4;
            } else {
              const tokenStart = globalPosition + nextTag;
              const tokenEnd = globalPosition + nextTag + 1;
              tokens.push({ type: OPEN_TAG_TOKEN, start: tokenStart, end: tokenEnd });
              state = STATE_TAG;
              cursor = nextTag + 1;
            }
          }
          break;
        }
        case STATE_TAG: {
          const code = str.charCodeAt(cursor);

          if (isWhitespace(code)) {
            cursor++;
          } else if (code === 62) {
            // ">"
            if (
              rawTextElements.has(lastTagName) &&
              tokens[tokens.length - 1]?.type !== SLASH_TOKEN
            ) {
              state = STATE_RAW_TEXT;
            } else {
              state = STATE_TEXT;
              lastTagName = "";
            }
            const tokenStart = globalPosition + cursor;
            const tokenEnd = globalPosition + cursor + 1;
            tokens.push({ type: CLOSE_TAG_TOKEN, start: tokenStart, end: tokenEnd });

            cursor++;
          } else if (code === 61) {
            // "="
            const tokenStart = globalPosition + cursor;
            const tokenEnd = globalPosition + cursor + 1;
            tokens.push({ type: EQUALS_TOKEN, start: tokenStart, end: tokenEnd });
            cursor++;
          } else if (code === 47) {
            // "/"
            const tokenStart = globalPosition + cursor;
            const tokenEnd = globalPosition + cursor + 1;
            tokens.push({ type: SLASH_TOKEN, start: tokenStart, end: tokenEnd });
            cursor++;
          } else if (code === 34 || code === 39) {
            // '"' or "'"
            const char = str[cursor] as "'" | '"';
            const tokenStart = globalPosition + cursor;
            const tokenEnd = globalPosition + cursor + 1;
            tokens.push({ type: QUOTE_CHAR_TOKEN, value: char, start: tokenStart, end: tokenEnd });
            quoteChar = char;
            state = STATE_ATTR_VALUE;
            cursor++;
          } else if (isIdentifierStart(code)) {
            const start = cursor;
            while (cursor < len && isIdentifierChar(str.charCodeAt(cursor))) cursor++;
            const value = str.slice(start, cursor);
            if (lastTagName === "") {
              lastTagName = value;
            }
            const tokenStart = globalPosition + start;
            const tokenEnd = globalPosition + cursor;
            tokens.push({ type: IDENTIFIER_TOKEN, value, start: tokenStart, end: tokenEnd });
          } else if (code === 46 && str[cursor + 1] === "." && str[cursor + 2] === ".") {
            // "."
            const tokenStart = globalPosition + cursor;
            const tokenEnd = globalPosition + cursor + 3;
            tokens.push({ type: SPREAD_TOKEN, start: tokenStart, end: tokenEnd });
            cursor += 3;
          } else {
            throw new Error(`Unexpected Character: ${str[cursor]}`);
          }
          break;
        }
        case STATE_ATTR_VALUE: {
          const endQuoteIndex = str.indexOf(quoteChar, cursor);
          if (endQuoteIndex === -1) {
            const tokenStart = globalPosition + cursor;
            const tokenEnd = globalPosition + len;
            tokens.push({
              type: ATTRIBUTE_VALUE_TOKEN,
              value: str.slice(cursor),
              start: tokenStart,
              end: tokenEnd,
            });
            cursor = len;
          } else {
            if (endQuoteIndex > cursor) {
              const tokenStart = globalPosition + cursor;
              const tokenEnd = globalPosition + endQuoteIndex;
              tokens.push({
                type: ATTRIBUTE_VALUE_TOKEN,
                value: str.slice(cursor, endQuoteIndex),
                start: tokenStart,
                end: tokenEnd,
              });
            }
            const tokenStart = globalPosition + endQuoteIndex;
            const tokenEnd = globalPosition + endQuoteIndex + 1;
            tokens.push({ type: QUOTE_CHAR_TOKEN, value: quoteChar as any, start: tokenStart, end: tokenEnd });
            state = STATE_TAG;
            quoteChar = "";
            cursor = endQuoteIndex + 1;
          }
          break;
        }
        case STATE_RAW_TEXT: {
          // Case-sensitive search for the specific closing tag with optional whitespace in between, e.g. < / textarea >
          const closeTagRegex = new RegExp(`<\\s*/\\s*${lastTagName}\\s*>`, "g");
          closeTagRegex.lastIndex = cursor;
          const match = closeTagRegex.exec(str);

          if (match) {
            const endOfRawIdx = match.index;
            if (endOfRawIdx > cursor) {
              const tokenStart = globalPosition + cursor;
              const tokenEnd = globalPosition + endOfRawIdx;
              tokens.push({
                type: TEXT_TOKEN,
                value: str.slice(cursor, endOfRawIdx),
                start: tokenStart,
                end: tokenEnd,
              });
            }
            state = STATE_TEXT;
            cursor = endOfRawIdx;
            lastTagName = "";
          } else {
            const tokenStart = globalPosition + cursor;
            const tokenEnd = globalPosition + len;
            tokens.push({ type: TEXT_TOKEN, value: str.slice(cursor), start: tokenStart, end: tokenEnd });
            cursor = len;
          }
          break;
        }
        case STATE_COMMENT: {
          // LOOK FOR END OF COMMENT: - - >
          const endComment = str.indexOf("-->", cursor);

          if (endComment === -1) {
            // If we don't find the closer in this string chunk,
            // we consume the rest of the string and stay in STATE_COMMENT
            cursor = len;
          } else {
            // Found it! Return to normal text parsing
            state = STATE_TEXT;
            cursor = endComment + 3;
          }
          break;
        }
      }
    }

    if (i < strings.length - 1) {
      if (state !== STATE_COMMENT) {
        const tokenStart = globalPosition + str.length;
        const tokenEnd = globalPosition + str.length;
        tokens.push({ type: EXPRESSION_TOKEN, value: i, start: tokenStart, end: tokenEnd });
      }
    }

    globalPosition += str.length;
  }

  return tokens;
};
