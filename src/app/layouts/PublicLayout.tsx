import { Outlet } from "react-router-dom";
import { Header } from "@/features/chrome/Header";
import { Footer } from "@/features/chrome/Footer";
import { CookieBanner } from "@/features/chrome/CookieBanner";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
