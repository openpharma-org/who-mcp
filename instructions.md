Here you go—**Cursor-ready Markdown** you can paste into a new `instructions.md` (or your README scratch) and follow step-by-step. It assumes you’ll start from your **who-mcp-server** template, keep JS (not TS), and then (a) recreate a minimal `fetch` tool and (b) add a specialized `fetch_yahoo_profile` tool that parses Yahoo’s **HTML** profile page into a clean row + Markdown.

---

# Yahoo Finance (HTML) MCP — Cursor Build Notes (JS)

> Goal: fork your existing JS MCP skeleton, recreate a minimal `fetch` tool, then add **`fetch_yahoo_profile`** that:
>
> 1. GETs `https://finance.yahoo.com/quote/{symbol}/profile/`
> 2. extracts the **embedded JSON** (`root.App.main → QuoteSummaryStore.assetProfile`)
> 3. returns both **JSON** (stable row) and **Markdown** (LLM-friendly table + values)

---

## 0) Repo setup

* In Cursor: **Clone** your template repo (`who-mcp-server`) into a new folder, e.g. `yahoo-mcp-server`.
* Update `package.json`:

  * `"name": "yahoo-mcp-server"`
  * Add `"type": "module"` (we’ll use ESM in Node 18+)
  * Add deps:

    ```json
    {
      "dependencies": {
        "@modelcontextprotocol/sdk": "^0.1.0",
        "zod": "^3.23.8",
        "undici": "^6.19.8"
      }
    }
    ```
  * Add scripts:

    ```json
    {
      "scripts": {
        "dev": "node src/index.js",
        "start": "node src/index.js"
      }
    }
    ```

Run:

```bash
npm i
```

---

## 1) File layout

```
yahoo-mcp-server/
  src/
    index.js               # MCP server entry: registers tools
    fetch-tool.js          # minimal fetch tool (raw or markdown)
    yahoo-profile.js       # parse & format Yahoo HTML → row + md
    dev-test.js            # optional local sanity test (no MCP)
  package.json
  README.md
```

---

## 2) `src/yahoo-profile.js` (parser + formatter)

```js
// src/yahoo-profile.js
import { fetch } from "undici";

/** Fetch the exact HTML profile URL for a ticker. */
export async function getYahooProfileHtml(symbol, ua = defaultUA()) {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/profile/`;
  const res = await fetch(url, {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.8",
      "User-Agent": ua
    }
  });
  if (!res.ok) {
    throw new Error(`Yahoo returned ${res.status} for ${url}`);
  }
  return await res.text();
}

/** Extract embedded JSON: root.App.main = { ... }; */
export function extractAssetProfile(html) {
  const m = html.match(/root\.App\.main\s*=\s*(\{.*?\});\s*<\/script>/s);
  if (!m) return null;
  try {
    const app = JSON.parse(m[1]);
    const stores =
      app?.context?.dispatcher?.stores ??
      app?.context?.dispatcher?.ContextDispatcher?.stores;
    const qss = stores?.QuoteSummaryStore;
    return qss?.assetProfile ?? null;
  } catch {
    return null;
  }
}

/** Map to the HuggingFace stock_profile schema row. */
export function toStockProfileRow(symbol, p) {
  return {
    symbol: symbol.toUpperCase(),
    address: p?.address1 ?? null,
    city: p?.city ?? null,
    country: p?.country ?? null,
    phone: p?.phone ?? null,
    zip: p?.zip ?? null,
    industry: p?.industry ?? null,
    sector: p?.sector ?? null,
    long_business_summary: p?.longBusinessSummary ?? null,
    full_time_employees: p?.fullTimeEmployees ?? null,
    report_date: new Date().toISOString().slice(0, 10)
  };
}

export function stockProfileSchemaMarkdown() {
  return `### stock_profile — Columns:

| Column Name | Column Type | Description |
|---|---|---|
| symbol | VARCHAR | Stock ticker symbol |
| address | VARCHAR | Company address |
| city | VARCHAR | City |
| country | VARCHAR | Country |
| phone | VARCHAR | Phone number |
| zip | VARCHAR | Zip code |
| industry | VARCHAR | Industry type |
| sector | VARCHAR | Business sector |
| long_business_summary | VARCHAR | Business summary |
| full_time_employees | INTEGER | Number of full-time staff |
| report_date | VARCHAR | Data reporting date |`;
}

export function rowAsMarkdown(row) {
  return `${stockProfileSchemaMarkdown()}

### Latest values
\`\`\`json
${JSON.stringify(row, null, 2)}
\`\`\``;
}

export function defaultUA() {
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
}
```

---

## 3) `src/fetch-tool.js` (minimal generic fetch)

> This recreates a small subset of the “fetch MCP” so your clients can still fetch arbitrary URLs. It returns **raw** or **truncated text**.

```js
// src/fetch-tool.js
import { fetch } from "undici";

export function registerFetchTool(server) {
  server.tool(
    {
      name: "fetch",
      description: "Fetch a URL and return raw text (optionally truncated).",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
          max_length: { type: "number", default: 200000 },
          raw: { type: "boolean", default: true },
          user_agent: { type: "string" }
        },
        required: ["url"]
      }
    },
    async ({ url, max_length = 200000, raw = true, user_agent }) => {
      const res = await fetch(url, {
        headers: {
          "User-Agent": user_agent || "MCP-Fetch/0.1 (+github:uh-joan)",
          "Accept": "*/*"
        }
      });
      if (!res.ok) throw new Error(`Fetch ${res.status} for ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const text = buf.toString("utf8");
      const out = text.length > max_length ? text.slice(0, max_length) : text;
      return {
        content: [{ type: raw ? "text" : "json", text: out }]
      };
    }
  );
}
```

---

## 4) Add **`fetch_yahoo_profile`** tool

```js
// (append in a new file or inline) src/yahoo-profile-tool.js
import { z } from "zod";
import {
  getYahooProfileHtml,
  extractAssetProfile,
  toStockProfileRow,
  rowAsMarkdown,
  defaultUA
} from "./yahoo-profile.js";

export function registerYahooProfileTool(server) {
  server.tool(
    {
      name: "fetch_yahoo_profile",
      description:
        "Fetch & parse Yahoo Finance HTML profile page for a ticker, returning a stock_profile row (JSON) and Markdown schema + values.",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          user_agent: { type: "string" }
        },
        required: ["symbol"]
      }
    },
    async ({ symbol, user_agent }) => {
      const html = await getYahooProfileHtml(symbol, user_agent || defaultUA());
      const profile = extractAssetProfile(html);
      if (!profile) {
        throw new Error(
          "Could not locate assetProfile in page (layout changed or bot page?)."
        );
      }
      const row = toStockProfileRow(symbol, profile);
      const md = rowAsMarkdown(row);
      return {
        content: [
          { type: "json", json: row },
          { type: "text", text: md }
        ]
      };
    }
  );
}
```

---

## 5) `src/index.js` (server entry)

```js
// src/index.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerFetchTool } from "./fetch-tool.js";
import { registerYahooProfileTool } from "./yahoo-profile-tool.js";

const server = new Server(
  {
    name: "yahoo-mcp-server",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// tools
registerFetchTool(server);
registerYahooProfileTool(server);

// transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 6) Optional local sanity check (no MCP)

```js
// src/dev-test.js
import { getYahooProfileHtml, extractAssetProfile, toStockProfileRow } from "./yahoo-profile.js";

const symbol = process.argv[2] || "GSK";

const html = await getYahooProfileHtml(symbol);
const p = extractAssetProfile(html);
if (!p) {
  console.error("No assetProfile found.");
  process.exit(1);
}
console.log(JSON.stringify(toStockProfileRow(symbol, p), null, 2));
```

Run:

```bash
node src/dev-test.js AAPL
```

---

## 7) Wire it into your client (Claude Desktop example)

```json
{
  "mcpServers": {
    "yahoo-mcp-server": {
      "command": "node",
      "args": ["./src/index.js"]
    }
  }
}
```

**Test prompts**

* “Call tool `fetch_yahoo_profile` with `{ symbol: "GSK" }`.”
* “Call tool `fetch` with `{ url: "https://example.com" }`.”

---

## 8) Behavior & output contract

**Tool:** `fetch_yahoo_profile`
**Input:**

```json
{ "symbol": "GSK" }
```

**Output (two content parts):**

* `application/json` row (stable schema)
* `text/markdown` with schema table and a `Latest values` block (LLM-friendly)

**Row fields (HuggingFace stock\_profile schema):**

* `symbol, address, city, country, phone, zip, industry, sector, long_business_summary, full_time_employees, report_date`

---

## 9) Practical notes

* **HTML only (as requested):** We do not call Yahoo’s JSON endpoints; we parse the embedded JSON that ships in the HTML.
* **Anti-bot pages:** If you hit a challenge page, extraction fails. Set a realistic **User-Agent**, add backoff/retry, and consider light caching.
* **Rate limiting:** If automating across many tickers, throttle requests (e.g., 2–4/sec) and add a small jitter.
* **Attribution/ToS:** You’re scraping public pages; review and comply with provider terms.

---

## 10) Next: add more “tables”

Once the pattern works, you can replicate for:

* `fetch_yahoo_officers` → `assetProfile.companyOfficers` (map to `stock_officers`)
* `fetch_yahoo_summary` → fields in `QuoteSummaryStore.summaryProfile`/`price` (map to `stock_summary`)
* `fetch_yahoo_earnings_calendar` → `earnings`/`calendarEvents`

Each: fetch HTML of the relevant page, extract the corresponding embedded store, map to a row schema, return `{ json, markdown }`.

---

### Done ✅

This gives you a clean JS MCP, keeping your habit of extending a known-good server, and layering in a **Yahoo HTML → schema** tool that’s perfect for LLMs and automations.
