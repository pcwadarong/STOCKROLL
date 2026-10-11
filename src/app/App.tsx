import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { LandingPage } from '@/pages/landing';
import { PrivacyPage, TermsPage } from '@/pages/legal';
import { LibraryPage, RecipesPage } from '@/pages/library';

/** App root: routes for the front page, the gear and recipe libraries, and the legal pages. */
export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/library" element={<Navigate to="/library/cameras" replace />} />
      <Route path="/library/:kind" element={<LibraryPage />} />
      <Route path="/library/:kind/:id" element={<LibraryPage />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/recipes/:id" element={<RecipesPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
