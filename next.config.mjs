/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: `next build` emits ./out, deployable on any static web server.
  output: 'export',
  images: { unoptimized: true },
};
export default nextConfig;
