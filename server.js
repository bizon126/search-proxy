import Fastify from 'fastify';
import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify();
const API_KEY = process.env.SEARCH_PROXY_KEY;

async function runSearch(query) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`);
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
  await page.screenshot({ path: 'debug.png', fullPage: true })
  await page.waitForSelector('a.result__a', { timeout: 10000 });
  const results = await page.$$eval('article[data-nir="result"]', nodes =>
    nodes.slice(0, 8).map(node => {
      const link = node.querySelector('a.result__a');
      const snippet = node.querySelector('.result__snippet');
      return {
        title: link?.textContent?.trim() ?? '',
        url: link?.href ?? '',
        snippet: snippet?.textContent?.trim() ?? '',
      };
    })
  );
  await browser.close();
  return results.filter(r => r.url);
}

fastify.get('/search', async (request, reply) => {
  const providedKey = request.headers['x-api-key'];
  if (!API_KEY || providedKey !== API_KEY) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  const { q } = request.query;
  if (!q) {
    return reply.code(400).send({ error: 'Missing q' });
  }
  try {
    const results = await runSearch(q);
    return { query: q, results };
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Search failed', details: err.message });
  }
});

const port = Number(process.env.PORT || 8787);
fastify.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`Search proxy listening on ${port}`);
});
