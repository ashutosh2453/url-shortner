const test = require("node:test");
const assert = require("node:assert/strict");
const U = require("../link-utils.js");

test("escapeHtml neutralises markup and attribute breakouts", () => {
  assert.equal(U.escapeHtml(`<img src=x onerror="alert(1)">`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(U.escapeHtml("it's `fine` & safe"), "it&#39;s &#96;fine&#96; &amp; safe");
  assert.equal(U.escapeHtml(null), "");
  assert.equal(U.escapeHtml(42), "42");
});

test("normalizeUrl accepts and normalises real web URLs", () => {
  for (const [input, expected] of [
    ["example.com", "https://example.com/"],
    ["  https://github.com/trending?since=weekly  ", "https://github.com/trending?since=weekly"],
    ["http://localhost:3000/path", "http://localhost:3000/path"],
    ["example.com:8080/x", "https://example.com:8080/x"],
    ["HTTPS://Example.COM/A", "https://example.com/A"],
    ["http://192.168.1.10/admin", "http://192.168.1.10/admin"],
  ]) {
    assert.deepEqual(U.normalizeUrl(input), { ok: true, url: expected }, input);
  }
});

test("normalizeUrl rejects dangerous or malformed input", () => {
  for (const bad of [
    "", "   ", "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd", "ftp://example.com", "not a url", "localhost-ish", "https://", "https://exa mple.com",
    "https://user:pass@example.com", "https://example..com", "x".repeat(2050) + ".com",
  ]) {
    assert.equal(U.normalizeUrl(bad).ok, false, `should reject: ${bad.slice(0, 40)}`);
  }
});

test("validateAlias enforces charset, length and reserved words", () => {
  assert.deepEqual(U.validateAlias(" summer sale "), { ok: true, alias: "summer-sale" });
  assert.deepEqual(U.validateAlias("git_tr-2"), { ok: true, alias: "git_tr-2" });
  for (const bad of ["ab", "-start", "end-", "a".repeat(33), "<img/src=x/onerror=alert(1)>", "path/traversal", "q?x=1", "emoji😀", "Admin", "login"]) {
    assert.equal(U.validateAlias(bad).ok, false, `should reject: ${bad}`);
  }
});

test("isAliasTaken is case-insensitive and can ignore the link being edited", () => {
  const links = [{ id: "a", alias: "Promo" }, { id: "b", alias: "docs" }];
  assert.equal(U.isAliasTaken(links, "promo"), true);
  assert.equal(U.isAliasTaken(links, "PROMO", "a"), false);
  assert.equal(U.isAliasTaken(links, "new"), false);
});

test("generateUniqueAlias avoids collisions and ambiguous characters", () => {
  const links = [];
  for (let i = 0; i < 500; i++) {
    const code = U.generateUniqueAlias(links);
    assert.match(code, /^[A-Za-z2-9]{6}$/);
    assert.doesNotMatch(code, /[01OlI]/);
    assert.equal(U.isAliasTaken(links, code), false);
    links.push({ id: String(i), alias: code });
  }
  assert.throws(() => U.generateUniqueAlias([{ id: "x", alias: "a" }], 1, 0));
});

test("expiry: valid through the end of the day, then marked expired", () => {
  const link = { expiry: "2026-11-16", status: "active" };
  assert.equal(U.isExpired(link, new Date("2026-11-16T23:00:00")), false);
  assert.equal(U.isExpired(link, new Date("2026-11-17T00:00:01")), true);
  assert.equal(U.isExpired({ expiry: "" }), false);

  const links = [{ ...link }, { expiry: "", status: "active" }, { expiry: "2026-01-01", status: "disabled" }];
  assert.equal(U.refreshExpiryStatus(links, new Date("2026-11-20T10:00:00")), true);
  assert.deepEqual(links.map((l) => l.status), ["expired", "active", "disabled"]);
  assert.equal(U.refreshExpiryStatus(links, new Date("2026-11-20T10:00:00")), false);
});

test("validateExpiry rejects past and malformed dates", () => {
  const now = new Date("2026-11-16T12:00:00");
  assert.deepEqual(U.validateExpiry("", now), { ok: true, expiry: "" });
  assert.deepEqual(U.validateExpiry("2026-11-16", now), { ok: true, expiry: "2026-11-16" });
  assert.equal(U.validateExpiry("2026-11-15", now).ok, false);
  assert.equal(U.validateExpiry("16/11/2026", now).ok, false);
});
