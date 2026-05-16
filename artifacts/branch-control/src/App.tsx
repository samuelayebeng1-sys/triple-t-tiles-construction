import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetSettings } from "@workspace/api-client-react";
import { applyAllColors } from "@/lib/theme";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Entry from "@/pages/Entry";
import StockSearch from "@/pages/Stock";
import Warehouses from "@/pages/Warehouses";
import Reports from "@/pages/Reports";
import Analytics from "@/pages/Analytics";
import Credits from "@/pages/Credits";
import Issues from "@/pages/Issues";
import SettingsPage from "@/pages/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
});

function ThemeLoader() {
  const { data: settings } = useGetSettings();
  useEffect(() => {
    if (settings) {
      applyAllColors({
        accentColor: settings.accentColor,
        loginGlowColor: settings.loginGlowColor,
        contentBarColor: settings.contentBarColor,
        sidebarColor: settings.sidebarColor,
        loginRightBg: settings.loginRightBg,
        contentBg: settings.contentBg,
      });
    }
  }, [settings?.accentColor, settings?.loginGlowColor, settings?.contentBarColor,
      settings?.sidebarColor, settings?.loginRightBg, settings?.contentBg]);
  return null;
}

function AppRoutes({ onLogout }: { onLogout: () => void }) {
  const [, setLocation] = useLocation();
  return (
    <Layout onLogout={() => { onLogout(); setLocation("/"); }}>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/entry" component={Entry} />
        <Route path="/stock" component={StockSearch} />
        <Route path="/warehouses" component={Warehouses} />
        <Route path="/reports" component={Reports} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/credit" component={Credits} />
        <Route path="/issues" component={Issues} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppShell() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [, setLocation] = useLocation();

  // Read company info from localStorage for login screen
  const logoUrl = localStorage.getItem("bc_logo") || "";
  const companyName = localStorage.getItem("bc_company") || "";

  function handleLogin() {
    setLoggedIn(true);
    setLocation("/dashboard");
  }

  return !loggedIn ? (
    <Login onLogin={handleLogin} logoUrl={logoUrl} companyName={companyName} />
  ) : (
    <AppRoutes onLogout={() => setLoggedIn(false)} />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeLoader />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
