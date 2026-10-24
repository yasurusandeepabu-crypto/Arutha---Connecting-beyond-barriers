import { fileURLToPath } from 'node:url';

const config = {
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  output: 'export',
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : ''),
  },
};
export default config;
