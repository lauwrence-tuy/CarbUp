import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarbUp",
  description:
    "Connect Strava, track activity calories, and update your daily CarbUp target automatically.",
  icons: {
    icon: [
      {
        url: "/images/carbup-tdf-flame-icon.svg",
        type: "image/svg+xml"
      },
      {
        url: "/images/carbup-tdf-flame-icon.png",
        sizes: "1024x1024",
        type: "image/png"
      }
    ],
    apple: [
      {
        url: "/images/carbup-tdf-flame-icon.png",
        sizes: "1024x1024",
        type: "image/png"
      }
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
