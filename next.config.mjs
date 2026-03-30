/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // ← rimosso per SSR

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 's3.eu-central-1.amazonaws.com', pathname: '/sendpulse-whatsapp-bot-files/**' },
      { protocol: 'https', hostname: 'login.sendpulse.com', pathname: '/api/chatbots-service/whatsapp/messages/media/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
};

export default nextConfig;

