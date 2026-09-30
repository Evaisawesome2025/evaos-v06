/* EvaOS V0.6 — one conversation. Real send, no invented replies. No secrets. */
(function () {
  "use strict";

  // Public address of the existing ask ingress. Not a secret. Not shown on the page.
  var WORKER_URL = window.EVAOS_WORKER_URL || "https://evaos-v05-ask.stump-lawyer-880.workers.dev";
  var OUTBOX_URL = "outbox/threads.json";
  var TOKEN_KEY = "evaos_v06_owner_bearer";
  var PENDING_KEY = "evaos_v06_pending";

  function getToken() {
    try {
      return (localStorage.getItem(TOKEN_KEY) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function setToken(v) {
    try {
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  function loadPending() {
    try {
      var list = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function savePending(list) {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (e) {}
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function voiceStatus(status) {
    if (status === "PROCESSING") return "Eva is working on this";
    if (status === "ANSWERED") return "Eva replied";
    if (status === "FAILED") return "That didn’t reach Eva";
    return "Eva got it";
  }

  function friendlyAskError(err) {
    var e = String(err || "");
    if (e === "unauthorized") return "That access code was not accepted. Paste the full code.";
    if (e === "rate_limited") return "Too many messages this hour. Try again later.";
    if (e === "empty_body") return "Write a short message first.";
    if (e === "body_too_long") return "Keep it under 240 characters.";
    if (e === "refused_credential_keywords") return "This page is public. Don’t put passwords or card numbers here.";
    if (e === "origin_denied") return "This page can’t send yet.";
    if (e === "write_failed" || e === "ingress_not_configured") return "That didn’t go through. Try again in a minute.";
    if (e === "network_or_worker_unreachable") return "That didn’t send. Check your connection and try again.";
    if (e === "request_failed" || e === "invalid_json" || e === "unsupported_type" || e === "not_found") {
      return "That didn’t send. Try again.";
    }
    if (!e) return "That didn’t send. Try again.";
    /* Stored codes only. Never echo an unknown string — it can leak plumbing. */
    if (/^[a-z0-9_]+$/.test(e)) return "That didn’t send. Try again.";
    return e;
  }

  function setAskStatus(text, cls) {
    var el = document.getElementById("ask-status");
    if (!el) return;
    el.textContent = text || "";
    el.className = "ask-status" + (cls ? " " + cls : "");
  }

  function summaryEl() {
    return document.getElementById("token-summary");
  }

  function updateTokenStatus() {
    var setup = document.getElementById("token-setup");
    var summary = summaryEl();
    var st = document.getElementById("token-status");
    if (getToken()) {
      if (summary) summary.textContent = "DOGFOOD · access code saved on this device";
      if (setup) setup.open = false;
      if (st) st.textContent = "Saved in this browser.";
    } else {
      if (summary) summary.textContent = "DOGFOOD · access code";
      if (st && st.textContent === "Saved in this browser.") st.textContent = "";
    }
  }

  var tokenForm = document.getElementById("token-form");
  if (tokenForm) {
    tokenForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("owner-token-input");
      var v = (input && input.value || "").trim();
      var st = document.getElementById("token-status");
      if (!v || v.length < 16) {
        if (st) st.textContent = "That code looks too short. Paste the full code Eva gave you.";
        return;
      }
      setToken(v);
      if (input) input.value = "";
      updateTokenStatus();
    });
  }

  var clearBtn = document.getElementById("clear-token");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      setToken("");
      updateTokenStatus();
      var st = document.getElementById("token-status");
      if (st) st.textContent = "Cleared from this device.";
      var setup = document.getElementById("token-setup");
      if (setup) setup.open = true;
    });
  }

  updateTokenStatus();

  function renderPending() {
    var root = document.getElementById("pending");
    if (!root) return;
    var list = loadPending();
    if (!list.length) {
      root.innerHTML = "";
      return;
    }
    var html = "";
    list.forEach(function (p) {
      html +=
        '<article class="turn mine">' +
        '<p class="said">' +
        esc(p.question || "") +
        "</p>" +
        '<p class="state">' +
        esc(voiceStatus(p.status)) +
        "</p>" +
        (p.error ? '<p class="hint">' + esc(friendlyAskError(p.error)) + "</p>" : "") +
        "</article>";
    });
    root.innerHTML = html;
  }

  function upsertPending(entry) {
    var list = loadPending().filter(function (p) {
      return p.intent_id !== entry.intent_id;
    });
    list.unshift(entry);
    savePending(list);
    renderPending();
  }

  function replyHtml(t) {
    var html = String((t && t.answer_html) || "").trim();
    var text = String((t && t.answer_text) || "").trim();
    if (!html) return esc(text);
    if (/<\s*script|<\/\s*script|on\w+\s*=|javascript:/i.test(html)) return esc(text);
    return html;
  }

  function isOwnerThread(t) {
    if (!t) return false;
    if (t.kind === "selftest") return false;
    return true;
  }

  function renderThreads(all) {
    var root = document.getElementById("threads");
    if (!root) return;
    var threads = (all || []).filter(isOwnerThread).filter(function (t) {
      return replyHtml(t);
    });
    if (!threads.length) {
      root.innerHTML = "";
      return;
    }
    var html = "";
    threads.forEach(function (t) {
      var about = "";
      if (t.question) about = "You asked “" + esc(t.question) + "”";
      html +=
        '<article class="turn hers">' +
        '<div class="said">' +
        replyHtml(t) +
        "</div>" +
        (about ? '<p class="context">' + about + "</p>" : "") +
        "</article>";
    });
    root.innerHTML = html;
  }

  function syncStatus(repliedNow) {
    var list = loadPending();
    var open = list.filter(function (p) {
      return p.status === "SENT" || p.status === "PROCESSING" || p.status === "FAILED";
    });
    if (open.length && open[0].status === "FAILED") {
      setAskStatus(friendlyAskError(open[0].error), "failed");
      return;
    }
    if (open.length && open[0].status === "PROCESSING") {
      setAskStatus("Eva is working on this", "working");
      return;
    }
    if (open.length && open[0].status === "SENT") {
      setAskStatus("Eva got it", "got");
      return;
    }
    if (repliedNow) setAskStatus("Eva replied", "replied");
  }

  function absorbOutbox(data) {
    var all = (data && data.threads) || [];
    var byId = {};
    all.forEach(function (t) {
      if (t && t.intent_id) byId[t.intent_id] = t;
    });
    var pending = loadPending();
    var still = [];
    var repliedNow = false;
    pending.forEach(function (p) {
      var t = p.intent_id && byId[p.intent_id];
      if (t && (t.status === "ANSWERED" || t.answer_text || t.answer_html)) {
        repliedNow = true;
        return;
      }
      if (t && t.status === "PROCESSING") p.status = "PROCESSING";
      if (t && t.status === "FAILED") {
        p.status = "FAILED";
        if (!p.error) p.error = "request_failed";
      }
      still.push(p);
    });
    savePending(still);
    renderPending();
    renderThreads(all);
    syncStatus(repliedNow);
  }

  var pollTimer = null;

  function pendingOpen() {
    return loadPending().some(function (p) {
      return p.status === "SENT" || p.status === "PROCESSING";
    });
  }

  function showLoadNote() {
    var root = document.getElementById("threads");
    if (!root || root.querySelector(".turn")) return;
    if (!root.querySelector(".load-note")) {
      var note = document.createElement("p");
      note.className = "load-note";
      note.textContent = "Her reply didn’t load. Refresh in a minute.";
      root.appendChild(note);
    }
  }

  function pollOutbox() {
    fetch(OUTBOX_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("load");
        return r.json();
      })
      .then(absorbOutbox)
      .catch(function () {
        if (pendingOpen()) showLoadNote();
      });
    if (pendingOpen() && !pollTimer) {
      pollTimer = setInterval(function () {
        pollOutbox();
        if (!pendingOpen()) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 8000);
    }
  }

  var realForm = document.getElementById("real-ask-form");
  var realInput = document.getElementById("real-ask-input");
  var submitBtn = document.getElementById("ask-submit");
  if (realForm && realInput) {
    realForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (realInput.value || "").trim();
      if (!q) return;
      var token = getToken();
      if (!token) {
        setAskStatus("Paste your access code first.", "failed");
        var setup = document.getElementById("token-setup");
        if (setup) {
          setup.open = true;
          var code = document.getElementById("owner-token-input");
          if (code) code.focus();
        }
        return;
      }
      if (submitBtn) submitBtn.disabled = true;

      fetch(WORKER_URL.replace(/\/$/, "") + "/intent", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "ask", body: q }),
      })
        .then(function (r) {
          return r.text().then(function (raw) {
            var data = {};
            try {
              data = raw ? JSON.parse(raw) : {};
            } catch (err) {
              data = {};
            }
            return { ok: r.ok, data: data };
          });
        })
        .then(function (res) {
          if (!res.ok || !res.data || res.data.status === "FAILED") {
            var code = (res.data && res.data.error) || "request_failed";
            setAskStatus(friendlyAskError(code), "failed");
            upsertPending({
              intent_id: (res.data && res.data.intent_id) || "local-" + Date.now(),
              question: q,
              status: "FAILED",
              error: String(code),
            });
            return;
          }
          realInput.value = "";
          setAskStatus("Eva got it", "got");
          upsertPending({
            intent_id: res.data.intent_id || "local-" + Date.now(),
            question: q,
            status: "SENT",
          });
          pollOutbox();
        })
        .catch(function () {
          var code = "network_or_worker_unreachable";
          setAskStatus(friendlyAskError(code), "failed");
          upsertPending({
            intent_id: "local-" + Date.now(),
            question: q,
            status: "FAILED",
            error: code,
          });
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  renderPending();
  syncStatus(false);
  pollOutbox();
})();
