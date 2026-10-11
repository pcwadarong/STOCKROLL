import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { LandingPage } from '@/pages/landing';
import { PrivacyPage, TermsPage } from '@/pages/legal';

/** App root: routes for the front page and the legal pages. */
export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
