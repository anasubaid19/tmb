import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMdBlocks } from "./md";

const html = (src: string): string =>
  renderToStaticMarkup(<div>{renderMdBlocks(src)}</div>);

describe("renderMdBlocks", () => {
  test("'&' tidak ter-escape ganda (bukan &amp;amp;)", () => {
    const out = html("Pola Asuh & Pergaulan");
    expect(out).toContain("Pola Asuh &amp; Pergaulan");
    expect(out).not.toContain("&amp;amp;");
  });

  test("'<' dan '>' aman sebagai teks (React escape sekali)", () => {
    const out = html("a < b > c");
    expect(out).toContain("a &lt; b &gt; c");
    expect(out).not.toContain("&amp;lt;");
  });

  test("tebal dan miring tetap dirender", () => {
    const out = html("**tebal** dan *miring*");
    expect(out).toContain("<strong>tebal</strong>");
    expect(out).toContain("<em>miring</em>");
  });
});
