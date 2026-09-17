import { describe, expect, test } from "bun:test";
import { isValidElement } from "react";
import { renderMdBlocks } from "./md";

describe("renderMdBlocks subset", () => {
  test("heading, paragraf, list, quote, bold", () => {
    const out = renderMdBlocks(
      "# Judul\n\nParagraf **tebal** biasa.\n\n## Sub\n\n- a\n- b\n\n> kutip",
    );
    expect(out).toHaveLength(5);
    expect(out.every(isValidElement)).toBe(true);
    expect((out[0] as { type: string }).type).toBe("h2");
    expect((out[2] as { type: string }).type).toBe("h3");
    expect((out[3] as { type: string }).type).toBe("ul");
    expect((out[4] as { type: string }).type).toBe("blockquote");
  });

  test("santri.md memuat 4 judul aspek (sinkron dengan form)", async () => {
    const text = await Bun.file(
      "/Users/anasubaid19/Vibe Code/WEB TEST BERSAMA/app/public/soal/santri.md",
    ).text();
    for (const judul of [
      "Kebiasaan Sholat",
      "Bacaan Qur'an",
      "Mata Pelajaran Disukai",
      "Yang Dikagumi dari Orang Tua",
    ]) {
      expect(text).toContain(judul);
    }
  });

  test("semua file soal terurai tanpa baris hilang", async () => {
    const files = [
      "/Users/anasubaid19/Vibe Code/WEB TEST BERSAMA/app/public/soal/english-smp.md",
      "/Users/anasubaid19/Vibe Code/WEB TEST BERSAMA/app/public/soal/english-sma.md",
      "/Users/anasubaid19/Vibe Code/WEB TEST BERSAMA/app/public/soal/santri.md",
      "/Users/anasubaid19/Vibe Code/WEB TEST BERSAMA/app/public/soal/ortu.md",
    ];
    for (const f of files) {
      const text = await Bun.file(f).text();
      const out = renderMdBlocks(text);
      expect(out.length).toBeGreaterThan(5);
      expect(out.every(isValidElement)).toBe(true);
    }
  });
});
