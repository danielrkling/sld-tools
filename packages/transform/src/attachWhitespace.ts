/**
 * Attach whitespace information to AST nodes for whitespace preservation.
 * Uses WeakMap to avoid modifying the parse package interfaces.
 */
import {
  RootNode,
  ElementNode,
  PropNode,
  StringProp,
  ExpressionProp,
  BooleanProp,
  SpreadProp,
} from 'parse-tagged-jsx';

// WeakMaps to store whitespace info without modifying AST node types
const elementWhitespace = new WeakMap<ElementNode, {
  whitespaceBeforeFirstProp?: string;
  whitespaceAfterLastProp?: string;
}>();

const propWhitespace = new WeakMap<PropNode, {
  whitespaceBefore?: string;
}>();

function getStringSegment(
  strings: string[],
  segment: number,
  start: number,
  end: number,
): string {
  const str = strings[segment];
  if (!str) return '';
  return str.slice(start, end);
}

function getTextBetween(
  strings: string[],
  seg1: number,
  pos1: number,
  seg2: number,
  pos2: number,
): string {
  if (seg1 === seg2) {
    return getStringSegment(strings, seg1, pos1, pos2);
  }
  let result = strings[seg1]?.slice(pos1) || '';
  for (let i = seg1 + 1; i < seg2; i++) {
    result += strings[i] || '';
  }
  result += strings[seg2]?.slice(0, pos2) || '';
  return result;
}

function getEndPosition(prop: PropNode, strings: string[]): { segment: number; pos: number } {
  if (prop.type === 'STRING') {
    const p = prop as StringProp;
    return {
      segment: p.tokens.string.segment,
      pos: p.tokens.string.end,
    };
  }
  if (prop.type === 'EXPRESSION') {
    const p = prop as ExpressionProp;
    // Expression at index p.tokens.expression.value ends at start of strings[value + 1]
    const exprIndex = p.tokens.expression.value;
    return {
      segment: exprIndex + 1,
      pos: 0,
    };
  }
  if (prop.type === 'BOOLEAN') {
    const p = prop as BooleanProp;
    return {
      segment: p.tokens.name.segment,
      pos: p.tokens.name.end,
    };
  }
  if (prop.type === 'SPREAD') {
    const p = prop as SpreadProp;
    return {
      segment: p.tokens.spread.segment,
      pos: p.tokens.spread.end,
    };
  }
  return { segment: 0, pos: 0 };
}

function attachToElement(
  element: ElementNode,
  strings: string[],
  expressions: any[],
): void {
  const props = element.props;

  // Attach whitespace before each prop
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    const nameToken = (prop as any).tokens?.name;
    if (!nameToken) continue;

    const propStart = nameToken.start;
    const propSegment = nameToken.segment;

    if (i === 0) {
      // Whitespace between tag name and first prop
      const tagNameEnd = element.tokens.openTag.name.end;
      const tagNameSegment = element.tokens.openTag.name.segment;
      if (propSegment === tagNameSegment) {
        propWhitespace.set(prop, {
          whitespaceBefore: getStringSegment(
            strings,
            tagNameSegment,
            tagNameEnd,
            propStart,
          ),
        });
        // Also set on element
        elementWhitespace.set(element, {
          ...elementWhitespace.get(element),
          whitespaceBeforeFirstProp: getStringSegment(
            strings,
            tagNameSegment,
            tagNameEnd,
            propStart,
          ),
        });
      }
    } else {
      // Whitespace between previous prop and this prop
      const prevProp = props[i - 1];
      const prevEnd = getEndPosition(prevProp, strings);
      if (prevEnd.segment === propSegment) {
        propWhitespace.set(prop, {
          whitespaceBefore: getStringSegment(
            strings,
            propSegment,
            prevEnd.pos,
            propStart,
          ),
        });
      } else {
        propWhitespace.set(prop, {
          whitespaceBefore: getTextBetween(
            strings,
            prevEnd.segment,
            prevEnd.pos,
            propSegment,
            propStart,
          ),
        });
      }
    }
  }

  // Whitespace after last prop
  if (props.length > 0) {
    const lastProp = props[props.length - 1];
    const lastEnd = getEndPosition(lastProp, strings);

    const isSelfClosing = element.tokens.openTag.slash !== undefined;
    let closePos: number;
    let closeSegment: number;

    if (isSelfClosing) {
      // For self-closing: whitespace before '/' (slash token)
      closePos = element.tokens.openTag.slash?.start || 0;
      closeSegment = element.tokens.openTag.slash?.segment || 0;
    } else {
      closePos = element.tokens.openTag.close?.start || 0;
      closeSegment = element.tokens.openTag.close?.segment || 0;
    }

    if (lastEnd.segment === closeSegment) {
      elementWhitespace.set(element, {
        ...elementWhitespace.get(element),
        whitespaceAfterLastProp: getStringSegment(
          strings,
          closeSegment,
          lastEnd.pos,
          closePos,
        ),
      });
    } else {
      elementWhitespace.set(element, {
        ...elementWhitespace.get(element),
        whitespaceAfterLastProp: getTextBetween(
          strings,
          lastEnd.segment,
          lastEnd.pos,
          closeSegment,
          closePos,
        ),
      });
    }
  }

  // Recursively process children
  for (const child of element.children) {
    if (child.type === 'ELEMENT') {
      attachToElement(child as ElementNode, strings, expressions);
    }
  }
}

export function attachWhitespaceInfo(
  ast: RootNode,
  strings: string[],
  expressions: any[],
): void {
  for (const child of ast.children) {
    if (child.type === 'ELEMENT') {
      attachToElement(child as ElementNode, strings, expressions);
    }
  }
}

// Getter functions to retrieve whitespace info
export function getPropWhitespaceBefore(prop: PropNode): string {
  return propWhitespace.get(prop)?.whitespaceBefore || ' ';
}

export function getElementWhitespaceBeforeFirstProp(element: ElementNode): string {
  return elementWhitespace.get(element)?.whitespaceBeforeFirstProp || ' ';
}

export function getElementWhitespaceAfterLastProp(element: ElementNode): string {
  return elementWhitespace.get(element)?.whitespaceAfterLastProp || '';
}
