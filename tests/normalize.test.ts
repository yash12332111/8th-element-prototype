import { describe, it, expect } from "vitest";
import { normalize, stripEdgePunct, wordCount } from "../lib/normalize";

describe("normalize", () => {
  it("normalises curly quotes, dashes, ellipses, collapses whitespace, and folds case", () => {
    const raw = "  ‘Here’s’ a “Special”   TEST—with   dashes – and … dots!  ";
    const result = normalize(raw);
    expect(result).toBe("'here's' a \"special\" test-with dashes - and ... dots!");
  });

  it("handles empty strings", () => {
    expect(normalize("")).toBe("");
    expect(normalize("   ")).toBe("");
  });
});

describe("stripEdgePunct", () => {
  it("strips edge punctuation and whitespace", () => {
    expect(stripEdgePunct("  \"hello world!\"  ")).toBe("hello world");
    expect(stripEdgePunct("- 'sample text.' -")).toBe("sample text");
  });
});

describe("wordCount", () => {
  it("counts words accurately", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   ")).toBe(0);
    expect(wordCount("one")).toBe(1);
    expect(wordCount("one two   three")).toBe(3);
  });
});
