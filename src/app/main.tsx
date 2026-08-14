import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ToastProvider } from "@/shared/ui/Toast";
import { LazyMotionRoot } from "@/shared/motion/LazyMotionRoot";
import { App } from "./App";
import "./index.css";

/* Vite BASE_URL follows `base` (e.g. "/REVALO24/" on GitHub Pages). */
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <ToastProvider>
          <LazyMotionRoot>
            <App />
          </LazyMotionRoot>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
