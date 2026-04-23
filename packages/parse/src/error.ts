import { BaseToken } from "./tokenize";

export class ParseJSXError extends Error {
  constructor(
    message: string,
    segment?: number,
    position?: number
  ) {
    super(message+ (segment !== undefined && position !== undefined ? ` segment ${segment}, position ${position}` : ""));
    this.name = "ParseJSXError";
  }
}
