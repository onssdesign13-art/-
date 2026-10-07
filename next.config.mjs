/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploaded media lives outside of the build (./data/uploads) and is streamed
  // through /media/[...path]; nothing to configure for next/image here.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Photo uploads go through a Route Handler using FormData.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
