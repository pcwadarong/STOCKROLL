import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { EditorStoreProvider } from '@/features/frame-photo';
import { EditorPage } from '@/pages/editor';
import { LandingPage } from '@/pages/landing';
import { PrivacyPage, TermsPage } from '@/pages/legal';
import { LibraryPage, RecipesPage } from '@/pages/library';

/**
 * App root. The editor store sits above the routes so an opened photo survives a trip to a
 * registration page and back.
 */
export const App = () => (
  <BrowserRouter>
    <EditorStoreProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/frame" element={<EditorPage />} />
        <Route path="/library" element={<Navigate to="/library/cameras" replace />} />
        <Route path="/library/:kind" element={<LibraryPage />} />
        <Route path="/library/:kind/:id" element={<LibraryPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipes/:id" element={<RecipesPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </EditorStoreProvider>
  </BrowserRouter>
);
