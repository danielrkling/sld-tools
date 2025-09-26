import { IToken, State, tokenize, TokenKind } from "./tokenize";

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

//Non reactive Comment Node <!--value-->
export type IComment = {
  type: INodeType.Comment;
  value: string;
  start: number;
  end: number;
};

export type IInsert = {
  type: INodeType.Insert;
  index: number; //index of hole
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
};

export type StringProperty = {
  type: INodeType.StringProperty;
  name: IName;
  quote: "'" | '"' | "";
  value: IText;
  start: number;
  end: number;
};

export type DynamicProperty = {
  type: INodeType.DynamicProperty;
  quote: "'" | '"' | "";
  name: IName;
  value: IInsert;
  start: number;
  end: number;
};

export type MixedProperty = {
  type: INodeType.MixedProperty;
  name: IName;
  quote: "'" | '"';
  values: IText | IInsert[];
  start: number;
  end: number;
};

// const enum State {
//   Literal,
//   BeforeOpenTag,
//   OpeningTag,
//   AfterOpenTag,
//   InValueNq,
//   InValueSq,
//   InValueDq,
//   ClosingOpenTag,
//   OpeningSpecial,
//   OpeningNormalComment,
//   InNormalComment,
//   InShortComment,
//   ClosingNormalComment,
//   ClosingTag,
// }

const enum Chars {
  _S = 32, // ' '
  _N = 10, // \n
  _T = 9, // \t
  _R = 13, // \r
  _F = 12, // \f
  Lt = 60, // <
  Ep = 33, // !
  Cl = 45, // -
  Sl = 47, // /
  Gt = 62, // >
  Qm = 63, // ?
  La = 97, // a
  Lz = 122, // z
  Ua = 65, // A
  Uz = 90, // Z
  Eq = 61, // =
  Sq = 39, // '
  Dq = 34, // "
  Ld = 100, // d
  Ud = 68, //D
}

function isWhiteSpace(char: string) {
  return /\s/.test(char);
}

function isValidTagChar(char: string) {
  return /[a-zA-Z_:\.\$\-]/.test(char);
}

function isLowerCase(char: string) {
  return /[a-z]/.test(char);
}

function isUpperCase(char: string) {
  return /[A-Z]/.test(char);
}
function isValidAttributeChar(char: string) {
  return /[^\s=\"\']/.test(char);
}

const LEFT_ANGLE = "<";

export function parse<T = any>(
  templates: TemplateStringsArray,
  ...values: T[]
): IRoot {
  let offset = 0;
  let state: State | undefined = undefined;
  let tokens: IToken[] = [];

  const root: IRoot = {
    type: INodeType.Root,
    children: [],
    start: 0,
    end: 0,
  };
  const parents = [root]
  let currentNode: Partial<IElement> | null = null
  let currentProp: Partial<IProperty> | null = null;

  for (let partIndex = 0; partIndex < templates.length; partIndex++) {
    const part = templates[partIndex];
    [tokens, offset, state] = tokenize(part, offset, state);
    console.log(tokens)

    for (const token of tokens) {
      switch (token.type) {
        case TokenKind.Literal:
          parents.at(-1)!.children.push({
            type: INodeType.Text,
            start: offset + token.start,
            end: offset + token.end,
            value: token.value,
          } as IText);
          break;
        case TokenKind.OpenTag:
          currentNode = {
            type: INodeType.Element,
            name: {
              type: INodeType.Name,
              value: token.value,
              start: offset + token.start,
              end: offset + token.end,
            },
            children: [],
            props: [],
          };
          parents.at(-1)!.children.push(currentNode)
          break;
        case TokenKind.OpenTagEnd:
          parents.push(currentNode)
          break;

        case TokenKind.CloseTag:
          parents.pop()
          currentNode = undefined
          break;

        case TokenKind.Whitespace:
          break;

        case TokenKind.AttrValueNq:
          currentProp = {
            name: {
              type: INodeType.Name,
              value: token.value,
              start: offset + token.start,
              end: offset + token.end
            }
          }
          break;

        case TokenKind.AttrValueEq:

        break;

        case TokenKind.AttrValueSq:
        case TokenKind.AttrValueDq:
          currentProp.type=INodeType.StringProperty
          currentProp.value = {
            value: token.value.slice(1,-1),
              start: offset + token.start,
              end: offset + token.end
          }
          currentNode.props?.push(currentProp)
          currentProp =  null
          break;
        
      }
    }
    

    if (currentNode){
    

    }else{
        parents.at(-1)?.children.push({
          type: INodeType.Insert,
          start: offset,
          end: offset,
          index: partIndex
        })
    }


    offset += part.length;
  }

  return root;
}
