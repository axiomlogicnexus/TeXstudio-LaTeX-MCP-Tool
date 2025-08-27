import { describe, it, expect } from "vitest";
import { parseLatexLog } from "../src/parsers/latexLog.js";

describe("parseLatexLog", () => {
  it("parses errors, warnings, and hbox messages", () => {
    const log = [
      "! Undefined control sequence.",
      "l.123 \\unknownCommand",
      "LaTeX Warning: Label(s) may have changed.",
      "Overfull \\hbox (10.0pt too wide) in paragraph at lines 10--12"
    ].join("\n");

    const diags = parseLatexLog(log);

    const has = (type: "error" | "warning" | "info", pred: (d: any) => boolean) =>
      diags.some((d) => d.type === type && pred(d));

    // Error: Undefined control sequence
    expect(
      has("error", (d) => /Undefined control sequence/.test(d.message))
    ).toBe(true);

    // Warning: rerun labels changed
    expect(
      has("warning", (d) => /Label\(s\) may have changed/.test(d.message))
    ).toBe(true);

    // Warning: Overfull hbox (code or message)
    expect(
      has(
        "warning",
        (d) => d.code === "overfull-hbox" || /Overfull \\hbox/.test(d.message)
      )
    ).toBe(true);
  });
});
