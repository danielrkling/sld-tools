import {  tokenize } from "./dist/tokenize.js";

const input = `<StyledButton value="val" primary disabled>Click me</StyledButton>`;

const tokens = tokenize(input,10,6 );
console.log(tokens);