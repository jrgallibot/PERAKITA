/**
 * Verify CURSOR_API_KEY from root .env against Cursor Cloud Agents API.
 * Usage: node scripts/verify-cursor-api.cjs
 */
require('./load-root-env.cjs');

const apiKey = process.env.CURSOR_API_KEY?.trim();
if (!apiKey) {
  console.error('Missing CURSOR_API_KEY in .env');
  process.exit(1);
}

const auth = Buffer.from(`${apiKey}:`, 'utf8').toString('base64');

async function main() {
  const res = await fetch('https://api.cursor.com/v0/me', {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    },
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`Cursor API error (${res.status}):`, body);
    process.exit(1);
  }

  console.log('Cursor API key is valid.');
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log(body);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
