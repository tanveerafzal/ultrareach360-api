import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ultrareach360 API",
  description: "RESTful API for Ultrareach360 platform integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
