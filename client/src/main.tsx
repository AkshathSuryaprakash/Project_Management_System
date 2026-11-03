import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NuqsAdapter } from "nuqs/adapters/react";

import "./index.css";
import App from "./App.tsx";
import QueryProvider from "./context/query-provider.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import { ThemeProvider } from "./context/theme-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <QueryProvider>
        <NuqsAdapter>
          <App />
        </NuqsAdapter>
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  </StrictMode>
);
