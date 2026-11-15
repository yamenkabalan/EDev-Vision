import type { NextConfig } from 'next';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') || '';
const config: NextConfig = {
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  devIndicators: false,
};
export default config;
