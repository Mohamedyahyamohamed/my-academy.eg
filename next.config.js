/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

// Sentry integration (optional — fails gracefully if not configured).
try {
  const { withSentryConfig } = require("@sentry/webpack-plugin");
  module.exports = withSentryConfig(nextConfig, {
    silent: true,
    sourcemaps: { disable: true },
  });
} catch {
  module.exports = nextConfig;
}
