"use client";

// Shown when the root layout itself fails, so the app's stylesheets may not be
// loaded. Inline styles mirror the CarbUp palette from app/carbon.scss.
const colors = {
  background: "#000000",
  card: "#17181c",
  text: "#ffffff",
  textSecondary: "#b5b5b5",
  yellow: "#ffdd00"
};

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main
          style={{
            alignItems: "center",
            background: colors.background,
            color: colors.text,
            display: "flex",
            fontFamily:
              'Inter, "SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            justifyContent: "center",
            minHeight: "100vh",
            padding: 16
          }}
        >
          <section
            style={{
              background: colors.card,
              border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: 28,
              boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
              maxWidth: 512,
              padding: 32,
              textAlign: "center",
              width: "100%"
            }}
          >
            <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.04em", margin: 0 }}>
              Carb<span style={{ color: colors.yellow }}>Up</span>
            </p>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                margin: "24px 0 0"
              }}
            >
              CarbUp needs a refresh
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
              The app hit a temporary error while loading.
            </p>
            <button
              onClick={reset}
              style={{
                background: colors.yellow,
                border: 0,
                borderRadius: 999,
                boxShadow:
                  "0 0 0 8px rgba(255,221,0,0.12), 0 16px 44px rgba(255,221,0,0.34)",
                color: "#000000",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
                marginTop: 16,
                minHeight: 44,
                padding: "0 20px"
              }}
              type="button"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
