"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { test } = require("node:test");
const bay = require("../bay.js");

function derive(pending, outbox) {
  return bay.derive({ pending: pending, outbox: outbox });
}

const empty = { threads: [], presence: [], approves: [] };

test("idle publication stays idle and does not spin", function () {
  var d = derive([], {
    threads: [],
    presence: [
      { id: "eva", status: "idle" },
      { id: "delivery", status: "idle" },
    ],
    approves: [],
  });
  assert.equal(d.working, false);
  assert.equal(d.heartbeat, "Idle");
  assert.deepEqual(d.workingNames, []);
  assert.equal(d.objective, null);
  assert.equal(d.evidence.length, 0);
  assert.equal(d.needsYou.length, 0);
  d.stages.forEach(function (s) {
    assert.equal(s.state, "idle");
  });
  assert.equal(d.stages[1].note, "Not working. Idle looks idle.");
  assert.equal(d.stages[3].note, "Nothing needs a yes.");
});

test("a sent objective is received and does not pretend the org is working", function () {
  var d = derive(
    [
      {
        kind: "objective",
        question: "Find the next honest bet",
        status: "SENT",
        intent_id: "abc123def456",
        submitted_at: "2026-10-02T12:00:00.000Z",
      },
    ],
    empty
  );
  assert.equal(d.working, false);
  assert.equal(d.heartbeat, "Idle");
  assert.equal(d.objective.text, "Find the next honest bet");
  assert.equal(d.objective.durable, true);
  assert.equal(d.stages[0].state, "published");
  assert.equal(d.stages[0].note, "Eva got it.");
  assert.equal(d.stages[1].state, "idle");
  assert.equal(d.stages[2].state, "idle");
  assert.equal(d.evidence.length, 0);
});

test("pending PROCESSING without an outbox event does not spin", function () {
  var d = derive(
    [{ kind: "objective", question: "Hold", status: "PROCESSING", intent_id: "abc" }],
    empty
  );
  assert.equal(d.working, false);
  assert.equal(d.stages[1].state, "idle");
});

test("a published PROCESSING thread spins and names no fake plan", function () {
  var d = derive([], {
    threads: [
      {
        kind: "objective",
        question: "OBJECTIVE: Price the next bet",
        status: "PROCESSING",
        intent_id: "thread-1",
      },
    ],
    presence: [{ id: "eva", status: "idle" }],
    approves: [],
  });
  assert.equal(d.working, true);
  assert.equal(d.heartbeat, "Working");
  assert.equal(d.objective.text, "Price the next bet");
  assert.equal(d.stages[0].note, "Eva got it.");
  assert.equal(d.stages[1].state, "now");
  assert.equal(d.stages[2].state, "idle");
  assert.equal(d.evidence.length, 0);
});

test("presence working spins and an answered thread does not", function () {
  var live = derive([], {
    threads: [],
    presence: [{ id: "delivery", status: "working" }],
    approves: [],
  });
  assert.equal(live.working, true);
  assert.deepEqual(live.workingNames, ["Delivery"]);

  var answered = derive([], {
    threads: [
      {
        kind: "objective",
        question: "OBJECTIVE: Watch ListingLift",
        status: "ANSWERED",
        answer_text: "Page is up. Nobody has paid.",
        evidence: [{ url: "https://evaisawesome2025.github.io/listinglift/", label: "ListingLift" }],
      },
    ],
    presence: [{ id: "eva", status: "idle" }],
    approves: [],
  });
  assert.equal(answered.working, false);
  assert.equal(answered.heartbeat, "Idle");
  assert.equal(answered.stages[1].state, "idle");
  assert.equal(answered.stages[2].state, "published");
  assert.equal(answered.evidence[0].links[0].href, "https://evaisawesome2025.github.io/listinglift/");
});

test("selftest, closed approves, and unsafe links stay out of the bay", function () {
  var d = derive([], {
    threads: [
      { kind: "selftest", status: "PROCESSING", question: "OBJECTIVE: ignore me", answer_text: "no" },
    ],
    presence: [{ id: "eva", status: "watching" }],
    approves: [
      { id: "done-1", status: "APPROVED", title: "Already decided" },
      { id: "nope", status: "REJECTED", title: "No" },
    ],
  });
  assert.equal(d.working, false);
  assert.equal(d.objective, null);
  assert.equal(d.evidence.length, 0);
  assert.equal(d.needsYou.length, 0);
  assert.equal(bay.safeHref("javascript:alert(1)"), "");
  assert.equal(bay.safeHref("http://example.com/a"), "");
  assert.equal(bay.safeHref("/evidence/note"), "/evidence/note");
});

test("an open approve is Needs you and a failed send is not received", function () {
  var d = derive(
    [{ kind: "objective", question: "Spend $10", status: "FAILED", intent_id: "local-1", error: "unauthorized" }],
    {
      threads: [],
      presence: [],
      approves: [
        {
          id: "ap-1",
          status: "PENDING",
          title: "Send the partner note",
          summary: "One email.",
          gates: ["send"],
        },
      ],
    }
  );
  assert.equal(d.objective.durable, false);
  assert.equal(d.stages[0].state, "idle");
  assert.equal(d.stages[0].note, "That didn’t reach Eva.");
  assert.equal(d.stages[3].state, "now");
  assert.equal(d.needsYou[0].title, "Send the partner note");
  assert.deepEqual(d.needsYou[0].gates, ["send"]);
});

test("the page keeps the non-claims strip and does not arm stranger write", function () {
  var root = path.join(__dirname, "..");
  var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  var app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  var css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(html, /Non-claims/);
  assert.match(html, /not a clean ship/i);
  assert.match(html, /Objective Bay/);
  assert.match(html, /Game · LATER/);
  assert.match(html, /https:\/\/joinermill\.com\/app\/guest\//);
  assert.match(html, /data-state="idle"/);
  assert.doesNotMatch(html, /type="email"/i);
  assert.match(html, /No checkout here/);
  assert.doesNotMatch(html, /stripe|add to cart|buy now/i);
  assert.doesNotMatch(html, /stump-lawyer/);
  assert.doesNotMatch(html, /clerk/i);
  assert.match(app, /evaos-v05-ask\.joinermill-ask\.workers\.dev/);
  assert.doesNotMatch(app, /stump-lawyer/);
  assert.match(app, /Nothing was sent/);
  assert.match(app, /OBJECTIVE: /);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(html, /BLOCKED/);
});
