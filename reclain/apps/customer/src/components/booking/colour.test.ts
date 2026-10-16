// Run: node --import tsx --test src/components/booking/colour.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import seed from "@shared/lib/data/seed-data.json";
import { avatarColours, contrastRatio, readableText } from "./colour";

test("contrast ratios match WCAG", () => {
  assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
  assert.equal(contrastRatio("#777777", "#777777"), 1);
});

test("dark backgrounds get white text and light ones get ink", () => {
  assert.equal(readableText("#2b1a4a"), "#ffffff");
  assert.equal(readableText("#141416"), "#ffffff");
  assert.equal(readableText("#f6b9a3"), "#111013");
  assert.equal(readableText("#e0b252"), "#111013"); // gold: white would be about 2:1
});

test("the third team member is no longer black on the darkest colour (finding)", () => {
  const { background, color } = avatarColours(["#2b1a4a", "#7b4fd6", "#f6b9a3"], 2);
  assert.equal(background, "#2b1a4a");
  assert.equal(color, "#ffffff");
});

test("every avatar in the sample venues is readable", () => {
  for (const b of seed.businesses) {
    const palette = b.palette as [string, string, string];
    for (let i = 0; i < 3; i++) {
      const { background, color } = avatarColours(palette, i);
      // Initials are 18px bold, which counts as large text: 3:1 is the minimum.
      assert.ok(contrastRatio(background, color) >= 3, `${b.slug} avatar ${i}: ${background} on ${color}`);
    }
  }
});
