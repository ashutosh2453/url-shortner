/**
 * ShortLink validation & security helpers.
 *
 * Loaded in the browser as a plain <script> (exposes window.LinkUtils) and in
 * Node via require() for the unit tests in test/link-utils.test.js.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LinkUtils = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };

  /** Escape a value for safe interpolation into HTML text or a quoted attribute. */
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"'`]/g, (c) => HTML_ESCAPES[c]);
  }

  const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
  const MAX_URL_LENGTH = 2048;

  /**
   * Validate and normalise a destination URL.
   * Adds https:// when no scheme is given; rejects javascript:, data:, file: and
   * anything that isn't a real http(s) URL with a plausible host.
   * @returns {{ ok: true, url: string } | { ok: false, error: string }}
   */
  function normalizeUrl(input) {
    const raw = String(input ?? "").trim();
    if (!raw) return { ok: false, error: "Destination URL is required." };
    if (raw.length > MAX_URL_LENGTH) return { ok: false, error: `URL is longer than ${MAX_URL_LENGTH} characters.` };
    if (/\s/.test(raw)) return { ok: false, error: "URL must not contain spaces." };

    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[^:/]+:\d+(\/|$)/.test(raw); // "example.com:8080" has no scheme
    let parsed;
    try {
      parsed = new URL(hasScheme ? raw : `https://${raw}`);
    } catch {
      return { ok: false, error: "That doesn't look like a valid URL." };
    }
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return { ok: false, error: "Only http:// and https:// links can be shortened." };
    }
    const host = parsed.hostname;
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[");
    if (!host || (!host.includes(".") && host !== "localhost" && !isIp) || /^\.|\.$|\.\./.test(host)) {
      return { ok: false, error: "URL needs a valid domain name, e.g. example.com." };
    }
    if (parsed.username || parsed.password) {
      return { ok: false, error: "URLs with embedded credentials are not allowed." };
    }
    return { ok: true, url: parsed.href };
  }

  const ALIAS_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,30}[A-Za-z0-9]$/;
  const RESERVED_ALIASES = new Set([
    "api", "app", "admin", "login", "logout", "register", "signup", "dashboard", "settings",
    "analytics", "details", "create", "static", "assets", "help", "about", "terms", "privacy",
  ]);

  /**
   * Validate a custom alias. Spaces become hyphens; 3-32 chars of letters,
   * digits, '-' or '_', must start and end with a letter or digit.
   * @returns {{ ok: true, alias: string } | { ok: false, error: string }}
   */
  function validateAlias(input) {
    const alias = String(input ?? "").trim().replace(/\s+/g, "-");
    if (!ALIAS_RE.test(alias)) {
      return { ok: false, error: "Alias must be 3-32 characters: letters, numbers, '-' or '_', starting and ending with a letter or number." };
    }
    if (RESERVED_ALIASES.has(alias.toLowerCase())) {
      return { ok: false, error: `"${alias}" is reserved. Please choose another alias.` };
    }
    return { ok: true, alias };
  }

  /** Aliases are compared case-insensitively so "Promo" and "promo" can't both exist. */
  function isAliasTaken(links, alias, exceptId) {
    const key = String(alias).toLowerCase();
    return links.some((l) => l.id !== exceptId && String(l.alias).toLowerCase() === key);
  }

  const CODE_CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/l/I

  function randomIndex(max) {
    const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    if (c && typeof c.getRandomValues === "function") {
      // Rejection sampling avoids modulo bias.
      const limit = Math.floor(0x100000000 / max) * max;
      const buf = new Uint32Array(1);
      do c.getRandomValues(buf); while (buf[0] >= limit);
      return buf[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  /** Generate a random short code that does not collide with existing links. */
  function generateUniqueAlias(links, length = 6, maxAttempts = 50) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let code = "";
      for (let i = 0; i < length; i++) code += CODE_CHARS[randomIndex(CODE_CHARS.length)];
      if (!isAliasTaken(links, code) && !RESERVED_ALIASES.has(code.toLowerCase())) return code;
    }
    throw new Error("Could not generate a unique short code; try a custom alias.");
  }

  /** A link with an expiry date (YYYY-MM-DD) stays valid through the end of that day. */
  function isExpired(link, now = new Date()) {
    if (!link || !link.expiry) return false;
    const end = new Date(`${link.expiry}T23:59:59.999`);
    return !Number.isNaN(end.getTime()) && now > end;
  }

  /** Validate an expiry date entered on the create form. */
  function validateExpiry(value, now = new Date()) {
    if (!value) return { ok: true, expiry: "" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00`).getTime())) {
      return { ok: false, error: "Expiry must be a valid date." };
    }
    if (isExpired({ expiry: value }, now)) return { ok: false, error: "Expiry date must be today or later." };
    return { ok: true, expiry: value };
  }

  /** Mark links whose expiry has passed. Returns true when anything changed. */
  function refreshExpiryStatus(links, now = new Date()) {
    let changed = false;
    for (const link of links) {
      if (link.status === "active" && isExpired(link, now)) {
        link.status = "expired";
        changed = true;
      }
    }
    return changed;
  }

  return {
    escapeHtml, normalizeUrl, validateAlias, isAliasTaken, generateUniqueAlias,
    isExpired, validateExpiry, refreshExpiryStatus, RESERVED_ALIASES,
  };
});
