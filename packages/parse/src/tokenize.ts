export const TEXT_TOKEN = "TEXT";
export const OPEN_TAG_TOKEN = "<";
export const CLOSE_TAG_TOKEN = ">";
export const SLASH_TOKEN = "/";
export const TAG_NAME_TOKEN = "TAG_NAME";
export const PROP_NAME_TOKEN = "PROP_NAME";
export const EQUALS_TOKEN = "=";
export const STRING_TOKEN = "STRING";
export const SPREAD_TOKEN = "SPREAD";
export const EXPRESSION_TOKEN = "EXPRESSION";
export const WHITESPACE_TOKEN = "WHITESPACE";
export const COMMENT_START_TOKEN = "COMMENT_START";
export const COMMENT_END_TOKEN = "COMMENT_END";
export const UNEXPECTED_CHARACTER_TOKEN = "UNEXPECTED_CHARACTER";

const isIdentifierChar = (code: number): boolean => {
  return (
    isIdentifierStart(code) ||
    (code >= 48 && code <= 58) ||
    code === 46 ||
    code === 45
  );
};

const isIdentifierStart = (code: number): boolean => {
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95 ||
    code === 36
  );
};

const isWhitespace = (code: number): boolean => {
  return (code >= 9 && code <= 13) || code === 32;
};

export interface BaseToken {
  segment: number;
  start: number;
  end: number;
}

export interface OpenTagToken extends BaseToken {
  type: typeof OPEN_TAG_TOKEN;
}

export interface CloseTagToken extends BaseToken {
  type: typeof CLOSE_TAG_TOKEN;
}

export interface SlashToken extends BaseToken {
  type: typeof SLASH_TOKEN;
}

export interface TagNameToken extends BaseToken {
  type: typeof TAG_NAME_TOKEN;
  value: string;
}

export interface PropNameToken extends BaseToken {
  type: typeof PROP_NAME_TOKEN;
  value: string;
}

export interface EqualsToken extends BaseToken {
  type: typeof EQUALS_TOKEN;
}

export interface StringToken extends BaseToken {
  type: typeof STRING_TOKEN;
  value: string;
  quote: "'" | '"';
}

export interface TextToken extends BaseToken {
  type: typeof TEXT_TOKEN;
  value: string;
}

export interface SpreadToken extends BaseToken {
  type: typeof SPREAD_TOKEN;
}

export interface WhitespaceToken extends BaseToken {
  type: typeof WHITESPACE_TOKEN;
  value: string;
}

export interface ExpressionToken {
  type: typeof EXPRESSION_TOKEN;
  value: number;
}

export const TAG_COMMENT_START = "<!--";
export const TAG_COMMENT_END = "-->";
export const LINE_COMMENT_START = "//";
export const LINE_COMMENT_END = "\n";
export const BLOCK_COMMENT_START = "/*";
export const BLOCK_COMMENT_END = "*/";

export interface CommentStartToken extends BaseToken {
  type: typeof COMMENT_START_TOKEN;
  value:
    | typeof TAG_COMMENT_START
    | typeof LINE_COMMENT_START
    | typeof BLOCK_COMMENT_START;
}

export interface CommentEndToken extends BaseToken {
  type: typeof COMMENT_END_TOKEN;
  value:
    | typeof TAG_COMMENT_END
    | typeof LINE_COMMENT_END
    | typeof BLOCK_COMMENT_END;
}

export interface UnexpectedCharacterToken extends BaseToken {
  type: typeof UNEXPECTED_CHARACTER_TOKEN;
  value: string;
}

export type Token =
  | OpenTagToken
  | CloseTagToken
  | SlashToken
  | TagNameToken
  | PropNameToken
  | EqualsToken
  | StringToken
  | TextToken
  | ExpressionToken
  | SpreadToken
  | WhitespaceToken
  | CommentStartToken
  | CommentEndToken
  | UnexpectedCharacterToken;

const STATE_TEXT = 0;
const STATE_TAG_START = 1;
const STATE_TAG = 2;
const STATE_TAG_COMMENT = 3;
const STATE_LINE_COMMENT = 4;
const STATE_BLOCK_COMMENT = 5;

export const tokenize = (strings: TemplateStringsArray | string[]): Token[] => {
  const tokens: Token[] = [];
  let state = STATE_TEXT;
  let returnToTagStart = false;

  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];
    const len = str.length;
    let cursor = 0;

    while (cursor < len) {
      switch (state) {
        case STATE_TEXT: {
          const nextTag = str.indexOf("<", cursor);
          if (nextTag === -1) {
            if (cursor < len) {
              tokens.push({
                type: TEXT_TOKEN,
                value: str.slice(cursor),
                segment: i,
                start: cursor,
                end: len,
              });
            }
            cursor = len;
          } else {
            if (nextTag > cursor) {
              tokens.push({
                type: TEXT_TOKEN,
                value: str.slice(cursor, nextTag),
                segment: i,
                start: cursor,
                end: nextTag,
              });
            }

            if (
              str[nextTag + 1] === "!" &&
              str[nextTag + 2] === "-" &&
              str[nextTag + 3] === "-"
            ) {
              state = STATE_TAG_COMMENT;
              cursor = nextTag + 4;
              tokens.push({
                type: COMMENT_START_TOKEN,
                value: TAG_COMMENT_START,
                segment: i,
                start: nextTag,
                end: nextTag + 4,
              });
            } else {
              tokens.push({
                type: OPEN_TAG_TOKEN,
                segment: i,
                start: nextTag,
                end: nextTag + 1,
              });
              state = STATE_TAG_START;
              cursor = nextTag + 1;
            }
          }
          break;
        }
        case STATE_TAG_START: {
          const wsStart = cursor;
          while (cursor < len && isWhitespace(str.charCodeAt(cursor))) cursor++;
          if (cursor > wsStart) {
            tokens.push({
              type: WHITESPACE_TOKEN,
              value: str.slice(wsStart, cursor),
              segment: i,
              start: wsStart,
              end: cursor,
            });
          }
          if (cursor >= len) break;

          if (isIdentifierStart(str.charCodeAt(cursor))) {
            const nameStart = cursor;
            while (cursor < len && isIdentifierChar(str.charCodeAt(cursor))) cursor++;
            tokens.push({
              type: TAG_NAME_TOKEN,
              value: str.slice(nameStart, cursor),
              segment: i,
              start: nameStart,
              end: cursor,
            });
            state = STATE_TAG;
            break;
          }

          const code = str.charCodeAt(cursor);

          if (code === 47 && cursor > wsStart) {
            if (str[cursor + 1] === "/") {
              tokens.push({
                type: COMMENT_START_TOKEN,
                segment: i,
                value: LINE_COMMENT_START,
                start: cursor,
                end: cursor + 2,
              });
              state = STATE_LINE_COMMENT;
              returnToTagStart = true;
              cursor += 2;
            } else if (str[cursor + 1] === "*") {
              tokens.push({
                type: COMMENT_START_TOKEN,
                segment: i,
                value: BLOCK_COMMENT_START,
                start: cursor,
                end: cursor + 2,
              });
              state = STATE_BLOCK_COMMENT;
              returnToTagStart = true;
              cursor += 2;
            } else {
              tokens.push({
                type: SLASH_TOKEN,
                segment: i,
                start: cursor,
                end: cursor + 1,
              });
              cursor++;
            }
          } else if (code === 47) {
            tokens.push({
              type: SLASH_TOKEN,
              segment: i,
              start: cursor,
              end: cursor + 1,
            });
            cursor++;
          } else if (code === 62) {
            state = STATE_TEXT;
            tokens.push({
              type: CLOSE_TAG_TOKEN,
              segment: i,
              start: cursor,
              end: cursor + 1,
            });
            cursor++;
          } else {
            tokens.push({
              type: UNEXPECTED_CHARACTER_TOKEN,
              value: str[cursor],
              segment: i,
              start: cursor,
              end: cursor + 1,
            });
            cursor++;
          }
          break;
        }
        case STATE_TAG: {
          const wsStart = cursor;
          while (cursor < len && isWhitespace(str.charCodeAt(cursor))) cursor++;
          if (cursor > wsStart) {
            tokens.push({
              type: WHITESPACE_TOKEN,
              value: str.slice(wsStart, cursor),
              segment: i,
              start: wsStart,
              end: cursor,
            });
          }
          if (cursor >= len) break;
          const code = str.charCodeAt(cursor);

          if (code === 62) {
            state = STATE_TEXT;
            tokens.push({
              type: CLOSE_TAG_TOKEN,
              segment: i,
              start: cursor,
              end: cursor + 1,
            });
            cursor++;
          } else if (code === 61) {
            tokens.push({
              type: EQUALS_TOKEN,
              segment: i,
              start: cursor,
              end: cursor + 1,
            });
            cursor++;
          } else if (code === 47) {
            if (str[cursor + 1] === "/") {
              tokens.push({
                type: COMMENT_START_TOKEN,
                segment: i,
                value: LINE_COMMENT_START,
                start: cursor,
                end: cursor + 2,
              });
              state = STATE_LINE_COMMENT;
              cursor += 2;
            } else if (str[cursor + 1] === "*") {
              tokens.push({
                type: COMMENT_START_TOKEN,
                segment: i,
                value: BLOCK_COMMENT_START,
                start: cursor,
                end: cursor + 2,
              });
              state = STATE_BLOCK_COMMENT;
              cursor += 2;
            } else {
              tokens.push({
                type: SLASH_TOKEN,
                segment: i,
                start: cursor,
                end: cursor + 1,
              });
              cursor++;
            }
          } else if (code === 34 || code === 39) {
            const quote = str[cursor] as "'" | '"';
            const endQuoteIndex = str.indexOf(quote, cursor + 1);
            if (endQuoteIndex === -1) {
              tokens.push({
                type: STRING_TOKEN,
                value: str.slice(cursor + 1),
                quote,
                segment: i,
                start: cursor,
                end: len,
              });
              cursor = len;
            } else {
              tokens.push({
                type: STRING_TOKEN,
                value: str.slice(cursor + 1, endQuoteIndex),
                quote,
                segment: i,
                start: cursor,
                end: endQuoteIndex + 1,
              });
              cursor = endQuoteIndex + 1;
            }
          } else if (isIdentifierStart(code)) {
            const nameStart = cursor;
            while (cursor < len && isIdentifierChar(str.charCodeAt(cursor))) cursor++;
            tokens.push({
              type: PROP_NAME_TOKEN,
              value: str.slice(nameStart, cursor),
              segment: i,
              start: nameStart,
              end: cursor,
            });
          } else if (
            code === 46 &&
            str[cursor + 1] === "." &&
            str[cursor + 2] === "."
          ) {
            tokens.push({
              type: SPREAD_TOKEN,
              segment: i,
              start: cursor,
              end: cursor + 3,
            });
            cursor += 3;
          } else {
            tokens.push({
              type: UNEXPECTED_CHARACTER_TOKEN,
              value: str[cursor],
              segment: i,
              start: cursor,
              end: cursor + 1,
            });
            cursor++;
          }
          break;
        }
        case STATE_TAG_COMMENT:
        case STATE_LINE_COMMENT:
        case STATE_BLOCK_COMMENT: {
          const isTagComment = state === STATE_TAG_COMMENT;
          const endTokenValue = isTagComment
            ? "-->"
            : state === STATE_LINE_COMMENT
              ? "\n"
              : "*/";
          const endComment = str.indexOf(endTokenValue, cursor);

          if (endComment === -1) {
            tokens.push({
              type: TEXT_TOKEN,
              value: str.slice(cursor),
              segment: i,
              start: cursor,
              end: len,
            });
            cursor = len;
          } else {
            state = isTagComment ? STATE_TEXT : (returnToTagStart ? STATE_TAG_START : STATE_TAG);
            returnToTagStart = false;
            const value = str.slice(cursor, endComment);
            if (value) {
              tokens.push({
                type: TEXT_TOKEN,
                value,
                segment: i,
                start: cursor,
                end: endComment,
              });
            }

            cursor = endComment + endTokenValue.length;
            tokens.push({
              type: COMMENT_END_TOKEN,
              segment: i,
              value: endTokenValue,
              start: endComment,
              end: endComment + endTokenValue.length,
            });
          }
          break;
        }
      }
    }

    if (i < strings.length - 1) {
      if (state === STATE_TAG_START) {
        state = STATE_TAG;
      }
      tokens.push({
        type: EXPRESSION_TOKEN,
        value: i,
      });
    }
  }

  return tokens;
};
