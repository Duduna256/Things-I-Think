import { test } from "node:test";
import assert from "node:assert/strict";
import { downscalePhoto, fitWithin, sizeText } from "./downscale";

test("fitWithin shrinks the longest edge to 1600 and never scales up", () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(fitWithin(3000, 4000), { width: 1200, height: 1600 });
  assert.deepEqual(fitWithin(1600, 900), { width: 1600, height: 900 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(0, 0), { width: 0, height: 0 });
  // A long thin strip still ends up at least 1px on its short side.
  assert.deepEqual(fitWithin(10_000, 2), { width: 1600, height: 1 });
});

test("sizes read in KB and MB", () => {
  assert.equal(sizeText(500), "1 KB");
  assert.equal(sizeText(245_760), "240 KB");
  assert.equal(sizeText(3.1 * 1024 * 1024), "3.1 MB");
});

test("outside a browser the photo is handed back untouched", async () => {
  const file = new File([new Uint8Array(10)], "site.jpg", { type: "image/jpeg" });
  assert.equal(await downscalePhoto(file), file);
});
