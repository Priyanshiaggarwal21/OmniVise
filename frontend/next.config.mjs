/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/decisions',
        destination: '/dashboard/decisions',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
