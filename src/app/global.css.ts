import { vars } from '@seed-design/css/vars';
import { globalStyle } from '@vanilla-extract/css';

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' });

// No vertical rubber-band at the document edges: on phones the shell scrolls the document, and a
// bounce there pulls the page away from the browser's own bars. Vertical only, so the horizontal
// swipe-back gesture keeps working.
globalStyle('html, body', { overscrollBehaviorY: 'none' });

// Declare font-family on body, not html, so it doesn't collide with SEED's fontScaling rule.
globalStyle('body', {
  margin: 0,
  background: vars.$color.bg.layerBasement,
  color: vars.$color.fg.neutral,
  fontFamily: 'var(--seed-font-family)',
});
