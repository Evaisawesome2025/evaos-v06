/* Helm v0.7 — Objective Bay dogfood. Real send only with the owner code.
   No invented replies. No stranger write. No secrets. */
(function () {
  "use strict";

  var WORKER_URL = window.EVAOS_WORKER_URL || "https://evaos-v05-ask.joinermill-ask.workers.dev";
  var OUTBOX_URL = "outbox/threads.json";
  var TOKEN_KEY = "evaos_v07_owner_bearer";
  var PENDING_KEY = "evaos_v07_pending";

  var localDecisions = {};
  var pollTimer = null;
  var lastView = null;
  var lastOutbox = { threads: [], presence: [], approves: [] };

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
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function friendlyAskError(err) {
    var e = String(err || "");
    if (e === "unauthorized") return "That access code was not accepted. Paste the full code.";
    if (e === "rate_limited") return "Too many messages this hour. Try again later.";
    if (e === "empty_body") return "Write a short objective first.";
    if (e === "body_too_long") return "Keep the objective shorter.";
    if (e === "refused_credential_keywords") return "This page is public. Don’t put passwords or card numbers here.";
    if (e === "origin_denied") return "This page can’t send yet.";
    if (e === "write_failed" || e === "ingress_not_configured") return "That didn’t go through. Try again in a minute.";
    if (e === "network_or_worker_unreachable") return "That didn’t send. Check your connection and try again.";
    if (e === "request_failed" || e === "invalid_json" || e === "unsupported_type" || e === "not_found") {
      return "That didn’t send. Try again.";
    }
    if (!e) return "That didn’t send. Try again.";
    if (/^[a-z0-9_]+$/.test(e)) return "That didn’t send. Try again.";
    return e;
  }

  function safeAnswerHtml(html, text) {
    var h = String(html || "").trim();
    if (!h) return esc(text);
    if (/<\s*script|<\/\s*script|on\w+\s*=|javascript:/i.test(h)) return esc(text);
    return h;
  }

  function setComposeStatus(text, cls) {
    var el = document.getElementById("compose-status");
    if (!el) return;
    el.textContent = text || "";
    el.className = "ask-status" + (cls ? " " + cls : "");
  }

  function updateTokenStatus() {
    var setup = document.getElementById("token-setup");
    var summary = document.getElementById("token-summary");
    var st = document.getElementById("token-status");
    if (getToken()) {
      if (summary) summary.textContent = "DOGFOOD · access code saved on this device";
      if (setup) setup.open = false;
      if (st) st.textContent = "Saved in this browser.";
    } else if (summary) {
      summary.textContent = "DOGFOOD · access code";
      if (st && st.textContent === "Saved in this browser.") st.textContent = "";
    }
  }

  function shortId(id) {
    var s = String(id || "");
    if (!s || s.indexOf("local-") === 0) return "";
    return s.length > 12 ? s.slice(0, 12) + "…" : s;
  }

  function whenLabel(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    try {
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }

  function render(view, loadNote) {
    lastView = view;
    var beat = document.getElementById("org-heartbeat");
    var beatLabel = document.getElementById("beat-label");
    if (beat) {
      beat.setAttribute("data-state", view.working ? "working" : "idle");
      var motion = false;
      try {
        motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (e) {}
      var spin = view.working ? (motion ? "working, motion reduced" : "working, spinning") : "idle, not spinning";
      beat.setAttribute("aria-label", "Org heartbeat, " + spin + ". Spins only when published work says the org is working.");
    }
    if (beatLabel) beatLabel.textContent = view.heartbeat;

    var empty = document.getElementById("objective-empty");
    var current = document.getElementById("objective-current");
    if (empty && current) {
      if (!view.objective) {
        empty.hidden = false;
        current.hidden = true;
        current.innerHTML = "";
      } else {
        empty.hidden = true;
        current.hidden = false;
        var sid = shortId(view.objective.id);
        var when = whenLabel(view.objective.at);
        var err = view.objective.error ? friendlyAskError(view.objective.error) : "";
        current.innerHTML =
          '<p class="said">' +
          esc(view.objective.text) +
          "</p>" +
          '<p class="meta">' +
          (sid ? "id " + esc(sid) : "No durable id") +
          (when ? " · " + esc(when) : "") +
          "</p>" +
          (err ? '<p class="hint">' + esc(err) + "</p>" : "");
      }
    }

    var rail = document.getElementById("stage-rail");
    if (rail) {
      rail.innerHTML = view.stages
        .map(function (s) {
          return (
            '<li class="stage" data-state="' +
            esc(s.state) +
            '"><p class="k">' +
            esc(s.label) +
            '</p><p class="note">' +
            esc(s.note) +
            "</p></li>"
          );
        })
        .join("");
    }

    var evidence = document.getElementById("evidence-list");
    var evidenceEmpty = document.getElementById("evidence-empty");
    if (evidence && evidenceEmpty) {
      if (!view.evidence.length) {
        evidenceEmpty.hidden = false;
        evidence.innerHTML = "";
      } else {
        evidenceEmpty.hidden = true;
        evidence.innerHTML = view.evidence
          .map(function (item) {
            var links = (item.links || [])
              .map(function (link) {
                return '<li><a href="' + esc(link.href) + '" rel="noopener noreferrer">' + esc(link.label) + "</a></li>";
              })
              .join("");
            var about = item.about ? '<p class="context">About “' + esc(item.about) + "”</p>" : "";
            return (
              '<article class="evidence-item"><p class="k">Published</p><div class="said">' +
              safeAnswerHtml(item.html, item.text) +
              "</div>" +
              about +
              (links ? "<ul>" + links + "</ul>" : "") +
              "</article>"
            );
          })
          .join("");
      }
    }

    var needsEmpty = document.getElementById("needs-empty");
    var needsList = document.getElementById("needs-list");
    if (needsEmpty && needsList) {
      if (!view.needsYou.length) {
        needsEmpty.hidden = false;
        needsList.innerHTML = "";
      } else {
        needsEmpty.hidden = true;
        needsList.innerHTML = view.needsYou
          .map(function (a) {
            var decided = localDecisions[a.id];
            var gates = (a.gates.length ? a.gates : ["Send, spend, and publish stay frozen until you decide."])
              .map(function (g) {
                return "<li>" + esc(g) + "</li>";
              })
              .join("");
            var actions = decided
              ? '<p class="hint">' +
                esc(
                  decided === "approved"
                    ? "Marked in this tab only. Not sent. Eva has not executed it. Refresh and it is still waiting if the packet is still published."
                    : "Marked declined in this tab only. Not sent. The action stays frozen."
                ) +
                "</p>"
              : '<p class="actions"><button type="button" class="approve-accept" data-approve-id="' +
                esc(a.id) +
                '">Approve</button><button type="button" class="approve-reject" data-approve-id="' +
                esc(a.id) +
                '">Decline</button></p><p class="hint">Recorded in this tab only. Durable Approve write-back is not connected.</p>';
            return (
              '<article class="need"><p class="k">Needs you · DOGFOOD</p><h3>' +
              esc(a.title) +
              "</h3><p>" +
              esc(a.summary) +
              "</p><ul>" +
              gates +
              "</ul>" +
              actions +
              "</article>"
            );
          })
          .join("");
      }
    }

    var load = document.getElementById("load-note");
    if (load) {
      load.hidden = !loadNote;
      load.textContent = loadNote || "";
    }
  }

  function paint(outbox, failed) {
    if (outbox) lastOutbox = outbox;
    var view = window.HelmBay.derive({
      pending: loadPending(),
      outbox: failed ? { threads: [], presence: [], approves: [] } : lastOutbox,
    });
    render(view, failed ? "Status didn’t load. Treated as idle." : "");
    return view;
  }

  function upsertPending(entry) {
    var list = loadPending().filter(function (p) {
      return p.intent_id !== entry.intent_id;
    });
    list.unshift(entry);
    savePending(list);
  }

  function absorbOutbox(data) {
    var threads = (data && data.threads) || [];
    var byId = {};
    threads.forEach(function (t) {
      if (t && t.intent_id && t.kind !== "selftest") byId[t.intent_id] = t;
    });
    var still = [];
    loadPending().forEach(function (p) {
      var t = p.intent_id && byId[p.intent_id];
      if (t && (t.status === "ANSWERED" || t.answer_text || t.answer_html)) return;
      if (t && t.status === "PROCESSING") p.status = "PROCESSING";
      if (t && t.status === "FAILED") {
        p.status = "FAILED";
        if (!p.error) p.error = "request_failed";
      }
      still.push(p);
    });
    savePending(still);
    var view = paint(data, false);
    if (view.working) setComposeStatus("Eva is working on this.", "working");
    else if (view.objective && view.objective.status === "SENT") setComposeStatus("Eva got it.", "got");
    else if (view.evidence.length && !loadPending().length) setComposeStatus("Eva replied.", "replied");
    schedulePoll(data);
  }

  function pendingOpen() {
    return loadPending().some(function (p) {
      return p.status === "SENT" || p.status === "PROCESSING";
    });
  }

  function schedulePoll(data) {
    var live = window.HelmBay.derive({
      pending: [],
      outbox: data || {},
    }).working;
    if ((pendingOpen() || live) && !pollTimer) {
      pollTimer = setInterval(pollOutbox, 8000);
    }
    if (!pendingOpen() && !live && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
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
        paint(null, true);
      });
  }

  var tokenForm = document.getElementById("token-form");
  if (tokenForm) {
    tokenForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("owner-token-input");
      var v = (input && input.value ? input.value : "").trim();
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

  var needsList = document.getElementById("needs-list");
  if (needsList) {
    needsList.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var id = t.getAttribute("data-approve-id");
      if (!id) return;
      if (t.classList.contains("approve-accept")) localDecisions[id] = "approved";
      else if (t.classList.contains("approve-reject")) localDecisions[id] = "rejected";
      else return;
      if (lastView) render(lastView, "");
    });
  }

  var form = document.getElementById("compose-form");
  var input = document.getElementById("compose-input");
  var submitBtn = document.getElementById("compose-submit");
  if (form && input) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (input.value || "").trim();
      if (!q) return;
      if (q.length > 220) {
        setComposeStatus("Keep the objective under 220 characters.", "failed");
        return;
      }
      var token = getToken();
      if (!token) {
        setComposeStatus("Owner dogfood only. Paste the access code. Nothing was sent.", "failed");
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
        body: JSON.stringify({ type: "ask", body: "OBJECTIVE: " + q }),
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
            setComposeStatus(friendlyAskError(code), "failed");
            upsertPending({
              intent_id: (res.data && res.data.intent_id) || "local-" + Date.now(),
              question: q,
              status: "FAILED",
              error: String(code),
              kind: "objective",
              submitted_at: new Date().toISOString(),
            });
            paint(null, false);
            return;
          }
          input.value = "";
          setComposeStatus("Eva got it.", "got");
          upsertPending({
            intent_id: res.data.intent_id || "local-" + Date.now(),
            question: q,
            status: "SENT",
            kind: "objective",
            submitted_at: new Date().toISOString(),
          });
          pollOutbox();
        })
        .catch(function () {
          var code = "network_or_worker_unreachable";
          setComposeStatus(friendlyAskError(code), "failed");
          upsertPending({
            intent_id: "local-" + Date.now(),
            question: q,
            status: "FAILED",
            error: code,
            kind: "objective",
            submitted_at: new Date().toISOString(),
          });
          paint(null, false);
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  updateTokenStatus();
  paint(null, false);
  pollOutbox();
})();
