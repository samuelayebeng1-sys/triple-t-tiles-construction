import { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function AppRoutes({ onLogout, company }: { onLogout: () => void; company: string }) {
  const [, setLocation] = useLocation();

  return (
    <Layout company={company} onLogout={() => { onLogout(); setLocation("/"); }}>
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
  const [company] = useState("Aseda Building Materials");
  const [, setLocation] = useLocation();

  function handleLogin() {
    setLoggedIn(true);
    setLocation("/dashboard");
  }

  return !loggedIn ? (
    <Login onLogin={handleLogin} />
  ) : (
    <AppRoutes onLogout={() => { setLoggedIn(false); setLocation("/"); }} company={company} />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
