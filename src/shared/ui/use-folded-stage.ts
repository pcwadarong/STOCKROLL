import { COMPACT_STAGE_FOLDED_SVH, COMPACT_STAGE_SVH } from '@/shared/config/responsive';
import { useScrolledPast } from '@/shared/lib/use-scrolled-past';

// Past the app bar (3.5rem) and a little more, so a nudge at the top does not fold the preview.
const FOLD_AFTER = 80;

/**
 * Tells the workbench to fold its pinned preview (`stageFolded`) once the page has scrolled
 * into the settings, and to unfold it back at the top. Only compact widths pin the preview; on
 * wide screens the page does not scroll and this stays false.
 * @returns true while the preview should be folded
 */
export const useFoldedStage = () =>
  useScrolledPast(
    FOLD_AFTER,
    // `svh` is a share of the smallest viewport; the live height is close enough to size the guard.
    Math.ceil((window.innerHeight * (COMPACT_STAGE_SVH - COMPACT_STAGE_FOLDED_SVH)) / 100),
  );
