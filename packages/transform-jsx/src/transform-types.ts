export interface OffsetMapping {
  taggedPosition: number;
  jsxPosition: number;
}

export interface TransformResult {
  code: string;
  mappings: OffsetMapping[];
  reverseMappings: OffsetMapping[];
}