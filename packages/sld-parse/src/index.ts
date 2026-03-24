export { tokenize } from "./tokenize";
export { 
  parse, 
  ROOT_NODE, 
  ELEMENT_NODE, 
  COMPONENT_NODE, 
  TEXT_NODE, 
  EXPRESSION_NODE, 
  BOOLEAN_PROP, 
  STRING_PROP as STATIC_PROP, 
  EXPRESSION_PROP, 
  SPREAD_PROP, 
  type RootNode, 
  type ElementNode, 
  type TextNode, 
  type ExpressionNode, 
  type ChildNode, 
  type PropNode, 
  type BooleanProp, 
  type StringProp as StaticProp, 
  type ExpressionProp, 
  type SpreadProp 
} from "./parse";

export const INodeType = {
  Root: 0,
  Text: 1,
  Comment: 2,
  Insert: 3,
  Element: 4,
  BooleanProperty: 5,
  StringProperty: 6,
  DynamicProperty: 7,
  MixedProperty: 8,
} as const;

export type IRoot = {
  type: typeof INodeType.Root;
  children: IChild[];
  start: number;
  end: number;
};

export type IText = {
  type: typeof INodeType.Text;
  value: string;
  start: number;
  end: number;
};

export type IInsert = {
  type: typeof INodeType.Insert;
  index: number;
  start: number;
  end: number;
};

export type IElement = {
  type: typeof INodeType.Element;
  props: IProperty[];
  children: IChild[];
  name: IName;
  open: IOpen;
  close?: IClose;
  start: number;
  end: number;
  selfClosing?: boolean;
};

export type IName = {
  value: string;
  start: number;
  end: number;
};

export type IOpen = {
  start: number;
  end: number;
};

export type IClose = {
  start: number;
  end: number;
};

export type IComment = {
  type: typeof INodeType.Comment;
  value: string;
  start: number;
  end: number;
};

export type IChild = IText | IElement | IInsert | IComment;

export type IProperty =
  | IBooleanProperty
  | IStringProperty
  | IDynamicProperty
  | IMixedProperty;

export type IBooleanProperty = {
  type: typeof INodeType.BooleanProperty;
  name: IName;
};

export type IStringProperty = {
  type: typeof INodeType.StringProperty;
  name: IName;
  quote: "'" | '"' | "";
  value: string;
  start: number;
  end: number;
};

export type IDynamicProperty = {
  type: typeof INodeType.DynamicProperty;
  name: IName;
  quote: "'" | '"' | "";
  valueIndex: number;
  start: number;
  end: number;
};

export type IMixedProperty = {
  type: typeof INodeType.MixedProperty;
  name: IName;
  quote: "'" | '"' | "";
  values: (IText | IInsert)[];
  start: number;
  end: number;
};

export { rawTextElements, voidElements } from "./util";
