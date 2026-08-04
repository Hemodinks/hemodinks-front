import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppContent } from './app/AppContent';
import { queryClient } from './queryClient';
import { GlobalActivityProvider } from './shared/activity/GlobalActivityProvider';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalActivityProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ErrorBoundary>
      </GlobalActivityProvider>
    </QueryClientProvider>
  );
}
