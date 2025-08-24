import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Configure for GitHub Pages
  basePath: isGitHubPages ? '/myagentwallet' : '',
  assetPrefix: isGitHubPages ? '/myagentwallet' : '',
  eslint: {
    // Completely disable ESLint during builds for deployment
    ignoreDuringBuilds: true,
    dirs: [],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Optimize bundle for browser compatibility
  compiler: {
    removeConsole: false, // Keep console logs for debugging
  },
  // Configure for both Turbopack (dev) and Webpack (build)
  turbopack: {
    // Turbopack configuration for development
    resolveAlias: {
      'pino-pretty': './empty-module.js',
    },
  },
  webpack: (config, { dev }) => {
    // Apply webpack config for both dev and production
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    
    // Resolve fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      'fs': false,
      'net': false,
      'tls': false,
      'crypto': false,
      'stream': false,
      'url': false,
      'zlib': false,
      'http': false,
      'https': false,
      'assert': false,
      'os': false,
      'path': false,
    };

    // Optimize ethers.js bundling
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          ethers: {
            test: /[\\/]node_modules[\\/](ethers|@ethersproject)[\\/]/,
            name: 'ethers',
            chunks: 'all',
            priority: 10,
          },
          walletconnect: {
            test: /[\\/]node_modules[\\/](@walletconnect|@reown)[\\/]/,
            name: 'walletconnect',
            chunks: 'all',
            priority: 9,
          },
        },
      },
    };

    return config;
  },
};

export default nextConfig;
