// Run: node --import tsx --test "src/app/pay/**/*.test.ts" (a plain path with [txRef] in it reads as a glob)
import { test } from "node:test";
import assert from "node:assert/strict";
import { headingWord, methodLabel, payeeName, promptQuestion } from "./prompt";

test("the prompt reads like the real thing", () => {
  assert.equal(
    promptQuestion({ method: "mtn", amount: 120000, payee: "RECLAIN", venue: "The Braid Republic" }),
    "MTN MoMo: pay UGX 120,000 to RECLAIN for The Braid Republic? Enter PIN",
  );
  assert.equal(
    promptQuestion({ method: "airtel", amount: 45000, payee: "RECLAIN", venue: "Fade Kings Barbershop" }),
    "Airtel Money: pay UGX 45,000 to RECLAIN for Fade Kings Barbershop? Enter PIN",
  );
  assert.equal(promptQuestion({ method: "card", amount: 8000, payee: "RECLAIN", venue: "Fresh Fold Laundry" }), "Card: pay UGX 8,000 to RECLAIN for Fresh Fold Laundry?");
});

test("the payee is the short name in capitals", () => {
  assert.equal(payeeName("reClain"), "RECLAIN");
  assert.equal(payeeName("Re-Clain!"), "RECLAIN");
  assert.equal(payeeName("***"), "RECLAIN");
});

test("labels and headings follow the method", () => {
  assert.equal(methodLabel("mtn"), "MTN MoMo");
  assert.equal(methodLabel("airtel"), "Airtel Money");
  assert.equal(methodLabel("card"), "Card");
  assert.deepEqual(headingWord("mtn"), { lead: "Check your", accent: "phone" });
  assert.deepEqual(headingWord("card"), { lead: "Finish", accent: "paying" });
});
