import 'dotenv/config';
import Fastify from 'fastify';
import { chromium } from 'playwright';

const fastify = Fastify();
const API_KEY = process.env.SEARCH_PROXY_KEY;

async function runSearch(query) {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('a h3', { timeout: 20000 });
  const results = await page.$$eval('a h3', nodes =>
    nodes
      .map(node => {
        const parent = node.closest('a');
        return {
          title: node.textContent?.trim() ?? '',
          url: parent?.href ?? '',
        };
      })
      .filter(result => result.url)
      .slice(0, 8)
  );
  await browser.close();
  return results;
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
