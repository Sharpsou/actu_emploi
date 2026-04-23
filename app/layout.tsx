import type { Metadata } from "next";
import { APP_THEME_STORAGE_KEY } from "@/src/services/theme/theme-preferences";
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
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const storedTheme = window.localStorage.getItem("${APP_THEME_STORAGE_KEY}");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : prefersDark
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
