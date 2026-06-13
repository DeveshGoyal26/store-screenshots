/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent MIME-type sniffing — stops browsers interpreting a PNG as HTML/JS
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Clickjacking protection (legacy header; frame-ancestors in CSP takes precedence)
          { key: "X-Frame-Options", value: "DENY" },
          // Disable the old browser XSS filter — it causes more harm than good in modern browsers
          { key: "X-XSS-Protection", value: "0" },
          // Limit referrer information on cross-origin requests
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Revoke browser features this app does not need
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
          },
          // Content Security Policy
          // Note: Next.js requires 'unsafe-inline' for script-src (inline hydration scripts).
          // Restricting connect-src to known AI endpoints prevents the AI proxy from being
          // redirected to arbitrary hosts by a crafted request.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js inlines hydration scripts — unsafe-inline is required
              "script-src 'self' 'unsafe-inline'",
              // Inline styles are used extensively throughout the editor
              "style-src 'self' 'unsafe-inline'",
              // data: for uploaded screenshots stored as data URLs; blob: for html-to-image export
              "img-src 'self' data: blob:",
              "font-src 'self'",
              // Only the two known AI provider endpoints are reachable from the browser
              "connect-src 'self' https://api.anthropic.com https://api.openai.com",
              "worker-src 'none'",
              // Blocks Flash/Java plugins entirely
              "object-src 'none'",
              // Prevents a <base href> injection from rewriting all relative URLs
              "base-uri 'self'",
              // Prevents this page from being embedded in any frame (stronger than X-Frame-Options)
              "frame-ancestors 'none'",
              // Restricts form submissions to same origin
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
