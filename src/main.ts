import { pathToFileURL } from 'node:url';
import { runActorBatch, type EdgarBillingEvent } from './adapters/apify-actor.js';
import { createEdgarMcpHttpServer } from './adapters/mcp-server.js';
import { SecHttpClient } from './adapters/sec-http-client.js';
import { runDualModeActor } from './shared/actor-runner.js';
import { createApifyBillingMeter } from './shared/billing-meter.js';

export async function main(): Promise<void> {
  const source = new SecHttpClient();
  const billing = createApifyBillingMeter<EdgarBillingEvent>();

  await runDualModeActor({
    runBatch: () => runActorBatch(source, billing),
    createMcpServer: () => createEdgarMcpHttpServer({ source, billing }),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
