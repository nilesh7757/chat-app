/** @type {import('next').NextConfig} */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: [
      'images.unsplash.com',
      'res.cloudinary.com', // allow Cloudinary images
    ],
  },
};

export default nextConfig;
