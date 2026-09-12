import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import WorkspacePage from "@/pages/WorkspacePage";
import ResultsPage from "@/pages/ResultsPage";
import LoginPage from "@/pages/LoginPage";
import CreateAccountPage from "@/pages/CreateAccountPage";
import ProfilePage from "@/pages/ProfilePage";
import { NagarikChatbot } from "@/components/NagarikChatbot";
import { LanguageProvider, LocalizedContent } from "@/lib/i18n";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <LocalizedContent><RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/create-account" component={CreateAccountPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/app/results" component={ResultsPage} />
        <Route path="/app" component={WorkspacePage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary></LocalizedContent>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
          <NagarikChatbot />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
