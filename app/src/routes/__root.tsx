import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { ThemeToggle } from "#/components/theme-toggle";
import { Toaster } from "#/components/ui/sonner";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Tes Masuk Bersama — AL-WILDAN ISLAMIC SCHOOL",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "apple-touch-icon",
        href: "/favicon.svg",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=MonteCarlo&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Anti-flicker: set tema sebelum paint (localStorage + OS). */}
        <script>{`(function(){try{var p=localStorage.getItem("tmb_theme");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`}</script>
      </head>
      <body>
        {children}
        <ThemeToggle />
        <Toaster position="top-center" richColors />
        <Scripts />
      </body>
    </html>
  );
}
