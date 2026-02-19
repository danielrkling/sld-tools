import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function countTopLevelElements(text: string): number {
  let count = 0;
  let depth = 0;
  let inTag = false;
  let tagName = "";
  let isClosing = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (!inTag && char === "<") {
      isClosing = text[i + 1] === "/";
      inTag = true;
      tagName = "";
      continue;
    }
    
    if (inTag) {
      if (char === ">") {
        if (isClosing) {
          depth--;
        } else if (!tagName.endsWith("/")) {
          depth++;
        }
        inTag = false;
        if (depth === 1 && isClosing) {
          count++;
        } else if (depth === 1 && !isClosing && !tagName.endsWith("/")) {
          count++;
        }
        continue;
      }
      
      if (tagName === "" && /[a-zA-Z]/.test(char)) {
        tagName = char;
      } else if (tagName && /[a-zA-Z0-9\-]/.test(char)) {
        tagName += char;
      }
      continue;
    }
  }
  
  return count;
}

function renderAttributes(attrs: ts.JsxAttributes, sourceFile: ts.SourceFile): string {
  const props = attrs.properties.map(prop => {
    if (ts.isJsxAttribute(prop)) {
      const name = prop.name.getText(sourceFile);
      if (prop.initializer) {
        if (ts.isJsxExpression(prop.initializer)) {
          return ` ${name}={${prop.initializer.expression?.getText(sourceFile) ?? ""}}`;
        }
        return ` ${name}="${prop.initializer.getText(sourceFile)}"`;
      }
      return ` ${name}`;
    }
    if (ts.isJsxSpreadAttribute(prop)) {
      return ` {...${prop.expression.getText(sourceFile)}}`;
    }
    return "";
  }).join("");
  return props;
}

function renderJsxChild(child: ts.JsxChild, sourceFile: ts.SourceFile): string {
  if (ts.isJsxText(child)) return child.getText(sourceFile);
  if (ts.isJsxExpression(child)) return `{${child.expression?.getText(sourceFile) ?? ""}}`;
  if (ts.isJsxElement(child)) {
    const tagName = child.openingElement.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.openingElement.attributes, sourceFile);
    const children = child.children.map(c => renderJsxChild(c, sourceFile)).join("");
    return `<${tagName}${attrs}>${children}</${tagName}>`;
  }
  if (ts.isJsxSelfClosingElement(child)) {
    const tagName = child.tagName.getText(sourceFile);
    const attrs = renderAttributes(child.attributes, sourceFile);
    return `<${tagName}${attrs} />`;
  }
  return "";
}

function sldToJsx(text: string): string {
  let result = text;
  
  const sourceFile = ts.createSourceFile(
    "test.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  
  function visit(node: ts.Node): void {
    if (ts.isTaggedTemplateExpression(node)) {
      const tagName = node.tag.getText(sourceFile);
      if (/^sld$/i.test(tagName)) {
        const nodeStart = node.getStart(sourceFile);
        const nodeEnd = node.getEnd();
        
        const template = node.template;
        let jsx = "";
        
        if (ts.isNoSubstitutionTemplateLiteral(template)) {
          jsx = template.text;
        } else if (ts.isTemplateExpression(template)) {
          jsx = template.head.text;
          for (const span of template.templateSpans) {
            const exprText = span.expression.getText(sourceFile);
            jsx += `{${exprText}}${span.literal.text}`;
          }
        }
        
        const topLevelElements = countTopLevelElements(jsx);
        if (topLevelElements > 1) {
          jsx = `<>${jsx}</>`;
        }
        
        result = result.slice(0, nodeStart) + jsx + result.slice(nodeEnd);
      }
    }
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return result;
}

function jsxToSld(text: string): string {
  let result = text;
  
  const sourceFile = ts.createSourceFile(
    "test.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  
  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();
      
      const tagName = node.openingElement.tagName.getText(sourceFile);
      const attrs = renderAttributes(node.openingElement.attributes, sourceFile);
      const children = node.children.map(c => renderJsxChild(c, sourceFile)).join("");
      const isSelfClosing = node.closingElement === undefined;
      
      let sld = "";
      if (isSelfClosing) {
        sld = `sld\`<${tagName}${attrs} />\``;
      } else {
        sld = `sld\`<${tagName}${attrs}>${children}</${tagName}>\``;
      }
      
      result = result.slice(0, nodeStart) + sld + result.slice(nodeEnd);
    } else if (ts.isJsxSelfClosingElement(node)) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();
      
      const tagName = node.tagName.getText(sourceFile);
      const attrs = renderAttributes(node.attributes, sourceFile);
      const sld = `sld\`<${tagName}${attrs} />\``;
      
      result = result.slice(0, nodeStart) + sld + result.slice(nodeEnd);
    }
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return result;
}

const fixturesDir = path.join(__dirname, "fixtures");

describe("sld-to-jsx", () => {
  const inputDir = path.join(fixturesDir, "sld-to-jsx", "input");
  const outputDir = path.join(fixturesDir, "sld-to-jsx", "output");
  
  if (!fs.existsSync(inputDir)) {
    it.skip("no input fixtures found", () => {});
    return;
  }
  
  const inputFiles = fs.readdirSync(inputDir).filter(f => f.endsWith(".ts"));
  
  for (const inputFile of inputFiles) {
    const inputPath = path.join(inputDir, inputFile);
    const outputPath = path.join(outputDir, inputFile.replace(".ts", ".tsx"));
    
    it(`transforms ${inputFile}`, () => {
      const input = fs.readFileSync(inputPath, "utf-8");
      const expected = fs.existsSync(outputPath) 
        ? fs.readFileSync(outputPath, "utf-8").trim() 
        : "";
      
      const result = sldToJsx(input);
      expect(result.trim()).toBe(expected.trim());
    });
  }
});

describe("jsx-to-sld", () => {
  const inputDir = path.join(fixturesDir, "jsx-to-sld", "input");
  const outputDir = path.join(fixturesDir, "jsx-to-sld", "output");
  
  if (!fs.existsSync(inputDir)) {
    it.skip("no input fixtures found", () => {});
    return;
  }
  
  const inputFiles = fs.readdirSync(inputDir).filter(f => f.endsWith(".tsx"));
  
  for (const inputFile of inputFiles) {
    const inputPath = path.join(inputDir, inputFile);
    const outputPath = path.join(outputDir, inputFile.replace(".tsx", ".ts"));
    
    it(`transforms ${inputFile}`, () => {
      const input = fs.readFileSync(inputPath, "utf-8");
      const expected = fs.existsSync(outputPath) 
        ? fs.readFileSync(outputPath, "utf-8").trim() 
        : "";
      
      const result = jsxToSld(input);
      expect(result.trim()).toBe(expected.trim());
    });
  }
});
