import {
  RootNode,
  ElementNode,
  TextNode,
  ExpressionNode,
  ChildNode,
  PropNode,
  BOOLEAN_PROP,
  STRING_PROP,
  EXPRESSION_PROP,
  SPREAD_PROP,
  BooleanProp,
  StringProp,
  ExpressionProp,
  SpreadProp,
} from "parse-jsx";

export function printJsx(node: RootNode): string {
  return node.children.map(printChild).join("");
}

function printChild(child: ChildNode): string {
  switch (child.type) {
    case "ELEMENT":
      return printElement(child);
    case "TEXT":
      return child.value;
    case "EXPRESSION":
      return `{${child.value}}`;
    default:
      return "";
  }
}

function printElement(node: ElementNode): string {
  const name = String(node.name);
  const attrs = printAttributes(node.props);
  const children = node.children.map(printChild).join("");
  
  const selfClosing = node.tokens.openTag.slash !== undefined;
  
  if (selfClosing) {
    return `<${name}${attrs} />`;
  }
  
  return `<${name}${attrs}>${children}</${name}>`;
}

function printAttributes(props: PropNode[]): string {
  if (props.length === 0) return "";
  
  const parts = props.map(prop => {
    switch (prop.type) {
      case BOOLEAN_PROP:
        return prop.name;
      case STRING_PROP:
        return `${prop.name}="${prop.value}"`;
      case EXPRESSION_PROP:
        return `${prop.name}={${prop.value}}`;
      case SPREAD_PROP:
        return `{...${prop.value}}`;
      default:
        return "";
    }
  });
  
  return " " + parts.join(" ");
}

export function printTagged(node: RootNode): string {
  const parts: string[] = [];
  const expressions: number[] = [];
  
  for (const child of node.children) {
    const result = printTaggedChild(child);
    parts.push(result.text);
    if (result.exprIndex !== null) {
      expressions.push(result.exprIndex);
    }
  }
  
  let template = parts.join("${}");
  if (expressions.length > 0) {
    const quasis: string[] = [];
    let lastIndex = 0;
    
    for (let i = 0; i < parts.length; i++) {
      quasis.push(parts[i]);
      if (i < expressions.length) {
        quasis.push("${");
      }
    }
    template = quasis.join("");
  }
  
  return `jsx\`${template}\``;
}

function printTaggedChild(child: ChildNode): { text: string; exprIndex: number | null } {
  switch (child.type) {
    case "ELEMENT":
      return printTaggedElement(child);
    case "TEXT":
      return { text: child.value, exprIndex: null };
    case "EXPRESSION":
      return { text: "", exprIndex: child.value };
    default:
      return { text: "", exprIndex: null };
  }
}

function printTaggedElement(node: ElementNode): { text: string; exprIndex: number | null } {
  const name = String(node.name);
  const attrs = printTaggedAttributes(node.props);
  const children = node.children.map(printTaggedChild);
  
  const childTexts = children.map(c => c.text).join("");
  const childExprs = children.map(c => c.exprIndex).filter((e): e is number => e !== null);
  
  const selfClosing = node.tokens.openTag.slash !== undefined;
  
  if (selfClosing) {
    return { text: `<${name}${attrs} />`, exprIndex: null };
  }
  
  return { text: `<${name}${attrs}>${childTexts}</${name}>`, exprIndex: null };
}

function printTaggedAttributes(props: PropNode[]): string {
  if (props.length === 0) return "";
  
  const parts = props.map(prop => {
    switch (prop.type) {
      case BOOLEAN_PROP:
        return prop.name;
      case STRING_PROP:
        return prop.name + '=$' + '{"' + prop.value + '"}';
      case EXPRESSION_PROP:
        return `${prop.name}=${prop.value}`;
      case SPREAD_PROP:
        return `...${prop.value}`;
      default:
        return "";
    }
  });
  
  return " " + parts.join(" ");
}
