export interface ErrorToken {
  segment?: number;
  start?: number;
  end?: number;
}

export class ParseJSXError extends Error {
  token?: ErrorToken;
  
  constructor(
    message: string,
    token?: ErrorToken,
  ) {
    super(
      message +
        (token
          ? ` ${token.segment}:${token.start}-${token.end}`
          : ""),
    );
    this.name = "ParseJSXError";
    this.token = token;
  }
}
