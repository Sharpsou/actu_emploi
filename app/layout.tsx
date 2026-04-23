import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Actu Emploi",
  description: "Veille emploi personnalisee pour profils data."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
