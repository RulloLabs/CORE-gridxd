import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import Index from "./pages/Index";

// ─── Lazy-loaded routes (Admin, legal pages, checkout not in initial bundle) ──
const Admin = lazy(() => import("./pages/Admin"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AvisoLegal = lazy(() => import("./pages/legal/AvisoLegal"));
const Privacidad = lazy(() => import("./pages/legal/Privacidad"));
const Cookies = lazy(() => import("./pages/legal/Cookies"));
const Terminos = lazy(() => import("./pages/legal/Terminos"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ─── Loading fallback for lazy routes ─────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─── QueryClient with sensible defaults (prevents excessive retries) ──────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes  
      retry: 1,                         // 1 retry max (vs default 3)
      refetchOnWindowFocus: false,      // Don't re-fetch on tab switch
    },
    mutations: {
      retry: 0,                         // No retry on mutations
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary>
            <BrowserRouter
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/checkout/success" element={<CheckoutSuccess />} />
                  <Route path="/legal/aviso-legal" element={<AvisoLegal />} />
                  <Route path="/legal/privacidad" element={<Privacidad />} />
                  <Route path="/legal/cookies" element={<Cookies />} />
                  <Route path="/legal/terminos" element={<Terminos />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
          <Analytics />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
