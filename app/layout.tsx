import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://carb-up-lilac.vercel.app"),
  applicationName: "CarbUp",
  title: "CarbUp",
  description:
    "Connect Strava, track activity calories, and update your daily CarbUp target automatically.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "CarbUp",
    description:
      "Connect Strava, track activity calories, and update your daily CarbUp target automatically.",
    url: "/",
    siteName: "CarbUp",
    images: [
      {
        url: "/images/carbup-tdf-flame-icon.png",
        width: 1024,
        height: 1024,
        alt: "CarbUp flame logo"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "CarbUp",
    description:
      "Connect Strava, track activity calories, and update your daily CarbUp target automatically.",
    images: ["/images/carbup-tdf-flame-icon.png"]
  },
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
