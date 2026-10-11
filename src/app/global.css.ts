import { vars } from '@seed-design/css/vars';
import { globalStyle } from '@vanilla-extract/css';

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' });

// Declare font-family on body, not html, so it doesn't collide with SEED's fontScaling rule.
globalStyle('body', {
  margin: 0,
  background: vars.$color.bg.layerBasement,
  color: vars.$color.fg.neutral,
  fontFamily: 'var(--seed-font-family)',
});
