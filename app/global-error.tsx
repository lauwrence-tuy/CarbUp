"use client";

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            alignItems: "center",
            background: "#0b0f14",
            color: "white",
            display: "flex",
            fontFamily: "Arial, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: 20
          }}
        >
          <section
            style={{
              background: "#171d25",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 28,
              maxWidth: 520,
              padding: 28,
              textAlign: "center"
            }}
          >
            <h1 style={{ fontSize: 28, margin: 0 }}>CarbUp needs a refresh</h1>
            <p style={{ color: "#96a0ad", lineHeight: 1.6 }}>
              The app hit a temporary error while loading.
            </p>
            <button
              onClick={reset}
              style={{
                background: "#9ee86f",
                border: 0,
                borderRadius: 999,
                color: "black",
                cursor: "pointer",
                fontWeight: 700,
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
