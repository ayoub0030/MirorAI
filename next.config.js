/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'i.ytimg.com',  // YouTube thumbnails
      'img.youtube.com',
      'youtube.com',
      'i9.ytimg.com',
      's.ytimg.com',
    ],
  },
};

module.exports = nextConfig;
