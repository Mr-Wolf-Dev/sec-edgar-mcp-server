# Miniguida Operativa: Lancio & SEO su Apify Store — `sec-edgar-mcp-server`

- **Title (SEO):** `SEC EDGAR Filings & Financials Monitor (10-K, 10-Q, 8-K + MCP)`
- **Short description:** `Extract official SEC EDGAR filings (10-K, 10-Q, 8-K, Form 4), company profiles & XBRL financials by ticker or CIK with no API key. 256 MB HTTP-only Actor + Standby MCP Server.`
- **Categories:** `Business`, `Finance`, `AI`
- **Icona:** carica `assets/actor-icon.png`
- **Memory:** `256 MB`, **Timeout:** `120` s
- **PPE Events:**
  - Mantieni `apify-actor-start` (`$0.00005`), rimuovi `apify-default-dataset-item`
  - `filing-extracted`: `$0.005` – `$0.01` *(Primary event)*
  - `mcp-query`: `$0.02` – `$0.05`
