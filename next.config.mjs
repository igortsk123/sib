/** @type {import('next').NextConfig} */
const nextConfig = {
  // Тип-ошибки роняют сборку — сборка должна быть реальным гейтом качества (конституция §4).
  // Линт — отдельный шаг гейта (`pnpm lint`), сборку не блокирует.
  // Security-заголовки. Строгий CSP — отдельный аккуратный шаг (nonce под inline-скрипты).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ]
  },
}

export default nextConfig
