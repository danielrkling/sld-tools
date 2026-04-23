import { describe, it, expect } from "vitest";
import { toJsx, toTagged } from "transform-jsx";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      
      const result = toJsx(input);
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
      
      const result = toTagged(input);
      expect(result.trim()).toBe(expected.trim());
    });
  }
});
