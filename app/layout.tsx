import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consultá el Censo 2022",
  description:
    "Interpretación transparente y reproducible de consultas sobre el Censo 2022 de Argentina.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
