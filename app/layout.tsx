import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Rest Is History — Timeline",
  description:
    "A visual timeline of human history, mapped to episodes of The Rest Is History.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ctext y='52' font-size='52'%3E%E2%8C%9B%3C/text%3E%3C/svg%3E"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
