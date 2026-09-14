import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { GasStatusIndicator } from "#/components/gas-status-indicator";
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
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="top-center" richColors />
        <div className="fixed right-3 bottom-3 z-50">
          <GasStatusIndicator />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
