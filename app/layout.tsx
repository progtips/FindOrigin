import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FindOrigin Bot",
  description: "Telegram bot for finding information sources",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
