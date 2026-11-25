# SEC EDGAR Filings & Financials Monitor + MCP

[![Mr-Wolf-Dev/sec-edgar-mcp-server MCP server](https://glama.ai/mcp/servers/Mr-Wolf-Dev/sec-edgar-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/Mr-Wolf-Dev/sec-edgar-mcp-server)

Extract, filter, and normalize **official SEC EDGAR filings (`10-K`, `10-Q`, `8-K`, `Form 4`, `S-1`)**, **company profiles**, and **structured XBRL financial metrics** (`revenue`, `netIncome`, `assets`, `liabilities`, `cashAndEquivalents`, `epsDiluted`) directly from **SEC EDGAR** — **with zero API key required**, available both as an **HTTP-only Apify Actor** and as a **Standby MCP Server** for AI agents.

Designed for **Pay-Per-Event (PPE)** cost efficiency with **zero headless browsers** (runs smoothly on **256 MB RAM**).

---

## Why Use This SEC EDGAR Scraper & MCP Server?

- **Official `data.sec.gov` JSON APIs:** Fast HTTP-only extraction with compliant SEC headers and automatic retries (`429`/`5xx`).
- **Ticker & CIK Resolution:** Pass stock tickers (`["AAPL", "NVDA", "MSFT"]`) or 10-digit CIKs seamlessly.
- **Structured XBRL Financials (`get_company_financials`):** Pulls latest `10-K`/`10-Q` US-GAAP revenue, net income, assets, liabilities, cash, and diluted EPS via MCP.
- **Dual Mode (Batch + Standby MCP):** Connect **n8n**, **Make**, **Claude Desktop**, or **Cursor** directly.

---

## Input Examples (Copy-Paste)

### 1. Latest Annual & Quarterly Filings (`10-K`, `10-Q`, `8-K`)
```json
{
  "tickersOrCiks": ["AAPL", "NVDA", "MSFT"],
  "forms": ["10-K", "10-Q", "8-K"],
  "maxItems": 25
}
```

### 2. Insider Trading (`Form 4`) Monitoring
```json
{
  "tickersOrCiks": ["TSLA", "META"],
  "forms": ["4"],
  "filedAfter": "2026-11-01",
  "maxItems": 50
}
```

---

## Standby MCP Server for AI Agents

Connect **Cursor**, **Claude Desktop**, or any Streamable HTTP MCP client to:

```text
https://mr-wolf-1--sec-edgar-mcp-server.apify.actor/mcp
```

### Exposed MCP Tools
- `search_sec_filings(tickersOrCiks, forms, filedAfter, filedBefore, maxItems)`
- `get_company_profile(tickerOrCik)`
- `get_company_financials(tickerOrCik)`

See [`docs/integrations/mcp-clients.md`](./docs/integrations/mcp-clients.md) for client configuration snippets.

---

## Automation Integrations (n8n & Make)

- **n8n workflow template:** [`docs/integrations/n8n-workflow.json`](./docs/integrations/n8n-workflow.json)
- **Make.com scenario blueprint:** [`docs/integrations/make-scenario.json`](./docs/integrations/make-scenario.json)

---

## Pay-Per-Event (PPE) Pricing

- `apify-actor-start`: Standard Actor startup event.
- `filing-extracted`: Charged once per normalized SEC filing pushed to the dataset in batch mode.
- `mcp-query`: Charged once per MCP tool invocation in Standby mode.

---

## Frequently Asked Questions (FAQ)

**Do I need an SEC API key?**
No. It queries official `sec.gov` and `data.sec.gov` public JSON endpoints directly with a compliant `User-Agent` header.

**Does it support XBRL financial metrics?**
Yes. Call the `get_company_financials` MCP tool with any US ticker or CIK to retrieve the latest `10-K`/`10-Q` US-GAAP revenue, net income, assets, liabilities, cash, and diluted EPS.

**Does it require proxies or a headless browser?**
No. It runs HTTP-only on `256 MB` RAM.

---

## Local Development

```bash
npm run typecheck && npm run lint && npm test && npm run build
apify run --purge
```

---

## Related Actors by mrWolf

- **[B2B Domain Intelligence & Email Verifier + MCP](https://apify.com/mr.wolf/domain-intel-mcp-server)** — Tech stack detection, DNS/MX/SPF/DMARC email readiness, and company contacts.
- **[Tech & Startup Jobs Scraper (Greenhouse, Lever, Ashby, SmartRecruiters + MCP)](https://apify.com/mr.wolf/ats-jobs-mcp-server)** — Live tech jobs, salaries, and B2B hiring signals.
- **[EU Public Tenders & Grants Monitor (TED Europa + MCP)](https://apify.com/mr.wolf/eu-tenders-mcp-server)** — Active European public procurement notices.
- **[SAM.gov US Federal Contracts & Grants + MCP](https://apify.com/mr.wolf/us-sam-tenders-mcp-server)** — Keyless US federal contract opportunities and contracting officer contacts.

---

## Quick REST API Call

```bash
curl -X POST "https://api.apify.com/v2/acts/mr.wolf~sec-edgar-mcp-server/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d {}
```

## Related HTTP-Only MCP Actors by Mr. Wolf

All Actors run HTTP-only (< 512 MB RAM, zero headless browsers) with Pay-Per-Event pricing and Streamable HTTP Standby MCP endpoints:

| Actor | Use Case | Apify Store | Source |
| --- | --- | --- | --- |
| **Shopify Store Intel, Apps & Catalog** | Themes, 28+ apps & pixels, BNPL payments, /products.json | [Apify Store](https://apify.com/mr.wolf/shopify-store-intel-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/shopify-store-intel-mcp-server) |
| **Global KYB Entity, LEI & EU VAT** | GLEIF LEI parent trees, EU VIES VAT, French SIRENE | [Apify Store](https://apify.com/mr.wolf/global-kyb-entity-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/global-kyb-entity-mcp-server) |
| **FDA Recalls, 510(k) & Clinical Trials** | openFDA recalls, 510(k) clearances, ClinicalTrials.gov v2 | [Apify Store](https://apify.com/mr.wolf/pharma-regulatory-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/pharma-regulatory-mcp-server) |
| **Tech & Startup Jobs (4 ATS APIs)** | Greenhouse, Lever, Ashby, SmartRecruiters + hiring signals | [Apify Store](https://apify.com/mr.wolf/ats-jobs-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/ats-jobs-mcp-server) |
| **B2B Domain Intel & Email Verifier** | DNS/MX/SPF/DMARC deliverability, tech stack & contacts | [Apify Store](https://apify.com/mr.wolf/domain-intel-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/domain-intel-mcp-server) |
| **EU Public Tenders & Grants (TED Europa)** | European procurement notices by CPV, country & budget | [Apify Store](https://apify.com/mr.wolf/eu-tenders-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/eu-tenders-mcp-server) |
| **SAM.gov US Federal Contracts** | Keyless US federal RFPs, NAICS & contracting officers | [Apify Store](https://apify.com/mr.wolf/us-sam-tenders-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/us-sam-tenders-mcp-server) |
