import * as Diff from "diff";

export interface MappingResult {
  mappings: OffsetMapping[];
  reverseMappings: OffsetMapping[];
}

export function computeMappings(
  oldCode: string,
  newCode: string,
): MappingResult {
  const mappings: OffsetMapping[] = [];
  const reverseMappings: OffsetMapping[] = [];

  let oldPos = 0;
  let newPos = 0;

  mappings.push({ taggedPosition: 0, jsxPosition: 0 });

  Diff.diffChars(oldCode, newCode).forEach((part: Diff.Change) => {
    if (part.added) {
      mappings.push({ taggedPosition: oldPos, jsxPosition: newPos });
      newPos += part.value.length;
      mappings.push({ taggedPosition: oldPos, jsxPosition: newPos });
    } else if (part.removed) {
      mappings.push({ taggedPosition: oldPos, jsxPosition: newPos });
      oldPos += part.value.length;
      mappings.push({ taggedPosition: oldPos, jsxPosition: newPos });
    } else {
      oldPos += part.value.length;
      newPos += part.value.length;
    }
  });

  for (const m of mappings) {
    reverseMappings.push({
      taggedPosition: m.jsxPosition,
      jsxPosition: m.taggedPosition,
    });
  }

  return { mappings, reverseMappings };
}

export function getJsxPosition(
  taggedPosition: number,
  mappings: OffsetMapping[],
  newCodeLength: number,
): number | undefined {
  if (taggedPosition < 0) return undefined;

  let lastMapping = mappings[0];
  for (const mapping of mappings) {
    if (mapping.taggedPosition <= taggedPosition) {
      lastMapping = mapping;
    } else {
      break;
    }
  }

  const offset = taggedPosition - lastMapping.taggedPosition;
  const newPosition = lastMapping.jsxPosition + offset;

  if (newPosition < 0 || newPosition > newCodeLength) {
    return undefined;
  }

  return newPosition;
}

export function getTaggedPosition(
  jsxPosition: number,
  reverseMappings: OffsetMapping[],
  taggedCodeLength: number,
): number | undefined {
  if (jsxPosition < 0) return undefined;

  let lastMapping = reverseMappings[0];
  for (const mapping of reverseMappings) {
    if (mapping.taggedPosition <= jsxPosition) {
      lastMapping = mapping;
    } else {
      break;
    }
  }

  const offset = jsxPosition - lastMapping.taggedPosition;
  const newPosition = lastMapping.jsxPosition + offset;

  if (newPosition < 0 || newPosition > taggedCodeLength) {
    return undefined;
  }

  return newPosition;
}
export interface OffsetMapping {
  taggedPosition: number;
  jsxPosition: number;
}
