# ShortLink: URL Shortener

A front-end URL shortener prototype with link management, custom aliases, expiry dates, QR codes and click analytics charts. All state is kept in the browser (`localStorage`), so it runs without a backend.

## Features

- Quick shortener on the landing page, plus a full create form (custom alias, expiry date, optional password)
- Dashboard with stats, a links table, copy-to-clipboard, alias editing and delete
- Link details page with QR code and recent-visit timeline
- Analytics dashboard (Chart.js) with simulated traffic
- Responsive layout with a mobile sidebar

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
npm start            # http://localhost:8080
```

## Tests

```bash
npm test
```

The validation and security helpers in `link-utils.js` are covered by Node's built-in test runner, and CI runs them on Node 20, 22 and 24.

## Security and validation

`link-utils.js` centralises the rules the UI relies on:

| Helper | What it enforces |
|---|---|
| `escapeHtml` | All link data (URLs, aliases, statuses, toast messages, click logs) is escaped before it is inserted into HTML |
| `normalizeUrl` | Only `http`/`https` URLs with a real domain, `localhost` or IP. Rejects `javascript:`, `data:`, `file:`, embedded credentials, spaces and URLs over 2048 characters. Adds `https://` when the scheme is missing |
| `validateAlias` | 3–32 characters of letters, digits, `-` and `_`; must start and end with a letter or digit; reserved words such as `admin` and `login` are blocked |
| `isAliasTaken` | Case-insensitive uniqueness, so `Promo` and `promo` can't both exist |
| `generateUniqueAlias` | Uses `crypto.getRandomValues` with rejection sampling, an alphabet without look-alike characters (`0/O`, `1/l/I`), and collision checks |
| `validateExpiry` / `refreshExpiryStatus` | Expiry dates must be today or later; links are marked `expired` once their date passes |

## Changelog

### 1.1.0 (2026-11-16)

- **Security fix (stored XSS):** link URLs and aliases were inserted into the dashboard with `innerHTML` without escaping. A link such as `https://x.com/"><img src=x onerror=...>`, or an alias like `<img/src=x/onerror=...>`, executed script every time the dashboard loaded. All dynamic HTML is now escaped, and short links open with `rel="noopener noreferrer"`.
- URL validation now rejects non-web schemes and malformed URLs instead of blindly prefixing `https://`.
- Aliases are validated, reserved words are blocked, and duplicates are detected case-insensitively, including when editing.
- Generated short codes are cryptographically random and checked for collisions.
- Expiry dates are validated and enforced: expired links are no longer counted as active.
- Chart.js is pinned to `4.4.7` instead of the floating latest version.
- Added unit tests, `package.json` scripts and GitHub Actions CI.
