import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppContent } from './app/AppContent';
import { ConsentProvider } from './features/privacy/ConsentProvider';
import { LegalDocumentPage } from './features/legal/LegalDocumentPage';
import { LEGAL_DOCUMENTS } from './features/legal/legalDocuments';
import { queryClient } from './queryClient';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <ConsentProvider>
            <Routes>
              <Route path="/termos-de-uso" element={<LegalDocumentPage document={LEGAL_DOCUMENTS['termos-de-uso']} />} />
              <Route path="/politica-de-privacidade" element={<LegalDocumentPage document={LEGAL_DOCUMENTS['politica-de-privacidade']} />} />
              <Route path="*" element={<AppContent />} />
            </Routes>
          </ConsentProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
