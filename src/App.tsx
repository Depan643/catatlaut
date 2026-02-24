import { useEffect } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { KapalProvider } from "@/contexts/KapalContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import InputPage from "./pages/InputPage";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import ViewProfile from "./pages/ViewProfile";
import NotFound from "./pages/NotFound";

const ACCENT_COLORS: Record<string, { light: string; dark: string }> = {
  blue: { light: '215 75% 28%', dark: '205 85% 55%' },
  green: { light: '150 60% 35%', dark: '150 60% 45%' },
  purple: { light: '270 60% 45%', dark: '270 60% 55%' },
  orange: { light: '25 90% 45%', dark: '25 90% 55%' },
  red: { light: '0 72% 45%', dark: '0 72% 55%' },
  teal: { light: '180 60% 35%', dark: '180 60% 45%' },
};

const applyAccentColor = (colorValue: string) => {
  const color = ACCENT_COLORS[colorValue];
  if (!color) return;
  const isDark = document.documentElement.classList.contains('dark');
  const hsl = isDark ? color.dark : color.light;
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
};

const ThemeInitializer = () => {
  useOnlineStatus();
  useEffect(() => {
    const loadTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from('profiles')
        .select('accent_color')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (data?.accent_color) {
        applyAccentColor(data.accent_color);
      }
    };
    loadTheme();

    const observer = new MutationObserver(() => {
      const stored = localStorage.getItem('lovable-accent-color');
      if (stored) applyAccentColor(stored);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <KapalProvider>
        <ThemeInitializer />
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/input/:id" element={<ProtectedRoute><InputPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><ViewProfile /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </KapalProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
