/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverActions: {
      // The product limit is 10 MiB; the small overhead allowance is for multipart encoding.
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
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
