/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "assets.duffel.com" }] },
};
export default nextConfig;
