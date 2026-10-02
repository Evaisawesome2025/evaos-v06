/* Helm v0.7 — Objective Bay rules.
   Stage rail and heartbeat come only from published events and this browser's
   dogfood pending line. No timers. No guest demo. No seat theater. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HelmBay = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var NAMES = {
    eva: "Eva",
    delivery: "Delivery",
    auditor: "AUDITOR",
    "client-success": "Client Success",
    growth: "Growth",
  };

  function cleanText(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  }

  function isSelfTest(t) {
    return !!(t && t.kind === "selftest");
  }

  function isLiveStatus(s) {
    s = String(s || "").toLowerCase();
    return s === "working" || s === "active";
  }

  function objectiveText(raw) {
    var t = cleanText(raw);
    return t.replace(/^OBJECTIVE:\s*/i, "").trim();
  }

  function safeHref(u) {
    var s = cleanText(u);
    if (!s || s.length > 500 || /[\s<>"']/.test(s)) return "";
    if (/^\/(?!\/)[A-Za-z0-9._~/-]*$/.test(s)) return s;
    if (!/^https:\/\//i.test(s)) return "";
    try {
      var url = new URL(s);
      if (url.protocol !== "https:") return "";
      return url.href;
    } catch (e) {
      return "";
    }
  }

  function linksFrom(t) {
    var raw = (t && (t.evidence || t.evidence_links)) || [];
    if (!Array.isArray(raw)) return [];
    var out = [];
    raw.forEach(function (item) {
      if (item == null) return;
      var href = safeHref(typeof item === "string" ? item : item.url || item.href);
      if (!href) return;
      var label = cleanText(typeof item === "string" ? "" : item.label || item.title) || href;
      out.push({ href: href, label: label });
    });
    return out;
  }

  function workingNames(presence) {
    if (!Array.isArray(presence)) return [];
    var names = [];
    presence.forEach(function (p) {
      if (!p || !isLiveStatus(p.status)) return;
      var id = cleanText(p.id);
      names.push(NAMES[id] || id || "Org");
    });
    return names;
  }

  function openApproves(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter(function (a) {
        if (!a || typeof a !== "object") return false;
        var s = String(a.status || "PENDING").toUpperCase();
        if (s === "APPROVED" || s === "REJECTED" || s === "DONE" || s === "CANCELLED" || s === "CANCELED") {
          return false;
        }
        return !!(cleanText(a.title) || cleanText(a.summary) || cleanText(a.body) || cleanText(a.id) || cleanText(a.approve_id));
      })
      .map(function (a) {
        return {
          id: cleanText(a.id || a.approve_id),
          title: cleanText(a.title) || "Consequential action",
          summary: cleanText(a.summary || a.body),
          gates: Array.isArray(a.gates) ? a.gates.map(cleanText).filter(Boolean) : [],
        };
      });
  }

  function derive(input) {
    input = input || {};
    var pending = Array.isArray(input.pending) ? input.pending : [];
    var outbox = input.outbox || {};
    var threads = (Array.isArray(outbox.threads) ? outbox.threads : []).filter(function (t) {
      return t && !isSelfTest(t);
    });
    var names = workingNames(outbox.presence);
    var threadWorking = threads.some(function (t) {
      return String(t.status || "").toUpperCase() === "PROCESSING";
    });
    var working = names.length > 0 || threadWorking;

    var pendingObj = null;
    pending.some(function (p) {
      if (p && p.kind === "objective") {
        pendingObj = p;
        return true;
      }
      return false;
    });

    var matched = null;
    if (pendingObj && pendingObj.intent_id) {
      threads.some(function (t) {
        if (t.intent_id && t.intent_id === pendingObj.intent_id) {
          matched = t;
          return true;
        }
        return false;
      });
    }

    var threadObj = null;
    if (!pendingObj) {
      threads.some(function (t) {
        var q = cleanText(t.question);
        if (t.kind === "objective" || /^OBJECTIVE:/i.test(q)) {
          threadObj = t;
          return true;
        }
        return false;
      });
    }

    var thread = matched || threadObj;
    var status = "none";
    var text = "";
    var id = "";
    var at = "";
    var error = "";
    if (pendingObj) {
      text = objectiveText(pendingObj.question);
      status = String(pendingObj.status || "SENT").toUpperCase();
      id = cleanText(pendingObj.intent_id);
      at = cleanText(pendingObj.submitted_at);
      error = cleanText(pendingObj.error);
    } else if (threadObj) {
      text = objectiveText(threadObj.question);
      status = String(threadObj.status || "").toUpperCase();
      id = cleanText(threadObj.intent_id);
      at = cleanText(threadObj.answered_ct || threadObj.submitted_at || "");
    }

    var evidence = [];
    threads.forEach(function (t) {
      var links = linksFrom(t);
      var answer = cleanText(t.answer_text);
      var html = String(t.answer_html || "").trim();
      if (!links.length && !answer && !html) return;
      evidence.push({
        intent_id: cleanText(t.intent_id),
        about: objectiveText(t.question),
        text: answer,
        html: html,
        links: links,
        status: String(t.status || "").toUpperCase(),
      });
    });

    var failed = !!(pendingObj && status === "FAILED");
    var accepted = false;
    if (pendingObj && !failed && (status === "SENT" || status === "PROCESSING" || status === "ANSWERED")) {
      accepted = true;
    }
    if (thread) {
      var ts = String(thread.status || "").toUpperCase();
      if (ts === "PROCESSING" || ts === "ANSWERED" || cleanText(thread.answer_text) || String(thread.answer_html || "").trim()) {
        accepted = true;
      }
    }

    var received = {
      id: "received",
      label: "Received",
      state: "idle",
      note: failed ? "That didn’t reach Eva." : "No objective yet.",
    };
    if (accepted) {
      received.state = "published";
      received.note = "Eva got it.";
    }

    var workingNote = "Not working. Idle looks idle.";
    if (working) {
      workingNote = names.length
        ? names.join(", ") + " marked working in the published status."
        : "A published thread is in progress.";
    }

    var needs = openApproves(outbox.approves);

    return {
      working: working,
      heartbeat: working ? "Working" : "Idle",
      workingNames: names,
      objective: text
        ? {
            text: text,
            id: id,
            durable: !!(id && id.indexOf("local-") !== 0),
            status: status,
            at: at,
            error: error,
          }
        : null,
      stages: [
        received,
        {
          id: "working",
          label: "Working",
          state: working ? "now" : "idle",
          note: workingNote,
        },
        {
          id: "evidence",
          label: "Evidence",
          state: evidence.length ? "published" : "idle",
          note: evidence.length ? "Published on this page." : "No evidence published on this page.",
        },
        {
          id: "needs-you",
          label: "Needs you",
          state: needs.length ? "now" : "idle",
          note: needs.length ? "An Approve is waiting." : "Nothing needs a yes.",
        },
      ],
      evidence: evidence,
      needsYou: needs,
    };
  }

  return {
    derive: derive,
    safeHref: safeHref,
    objectiveText: objectiveText,
  };
});
