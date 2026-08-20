/** @type {import('next').NextConfig} */
const path = require('path');
require('../../scripts/load-root-env.cjs');

const isProdBuild = process.env.NODE_ENV === 'production';

const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
  // Static export is for `next build` / Vercel only.
  // `next dev` needs a normal .next server (routes-manifest.json).
  ...(isProdBuild ? { output: 'export' } : {}),
  images: { unoptimized: true },
  transpilePackages: ['@perakita/shared'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;
