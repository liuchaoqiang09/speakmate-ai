/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 语音 SDK 只在浏览器使用，避免被打进服务端包。
    serverComponentsExternalPackages: ["@volcengine/rtc"],
  },
};

export default nextConfig;
