import { Snackbar } from '@seed-design/react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { AppUpdate } from '@/features/app-update';
import { EditorStoreProvider, useHasOpenPhotos } from '@/features/frame-photo';
import { EditorPage } from '@/pages/editor';
import { LandingPage } from '@/pages/landing';
import { PrivacyPage, TermsPage } from '@/pages/legal';
import {
  LibraryPage,
  RecipeCardPage,
  RecipeDetailPage,
  RecipeEditPage,
  RecipeListPage,
  StripDetailPage,
  StripEditPage,
  StripListPage,
} from '@/pages/library';
import { MePage } from '@/pages/me';

// A reload would drop the photos open in the editor, so the update waits for them.
const Updates = () => <AppUpdate holdReload={useHasOpenPhotos()} />;

/**
 * App root. The editor store sits above the routes so an opened photo survives a trip to a
 * registration page and back. The snackbar provider wraps everything so the tab bar can keep
 * notices clear of itself.
 */
export const App = () => (
  <Snackbar.RootProvider>
    <BrowserRouter>
      <EditorStoreProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/frame" element={<EditorPage />} />
          <Route path="/library" element={<Navigate to="/library/cameras" replace />} />
          <Route path="/library/:kind" element={<LibraryPage />} />
          <Route path="/library/:kind/:id" element={<LibraryPage />} />
          <Route path="/library/:kind/:id/edit" element={<LibraryPage editing />} />
          <Route path="/recipes" element={<RecipeListPage />} />
          <Route path="/recipes/new" element={<RecipeEditPage />} />
          <Route path="/recipes/strips" element={<StripListPage />} />
          <Route path="/recipes/strips/new" element={<StripEditPage />} />
          <Route path="/recipes/strips/:id" element={<StripDetailPage />} />
          <Route path="/recipes/strips/:id/edit" element={<StripEditPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/recipes/:id/edit" element={<RecipeEditPage />} />
          <Route path="/recipes/:id/card" element={<RecipeCardPage />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Updates />
      </EditorStoreProvider>
    </BrowserRouter>
    <Snackbar.Region>
      <Snackbar.Renderer />
    </Snackbar.Region>
  </Snackbar.RootProvider>
);
