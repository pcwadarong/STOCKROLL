export type OutputPreset =
  | { id: string; label: string; hint: string; kind: 'fixed'; width: number; height: number }
  | { id: string; label: string; hint: string; kind: 'original'; longEdge: number };

// Working defaults, not each platform's official maximum resolution.
export const OUTPUT_PRESETS = [
  { id: '3x4', label: '3:4', hint: 'Instagram portrait', kind: 'fixed', width: 1080, height: 1440 },
  { id: '4x5', label: '4:5', hint: 'Instagram feed', kind: 'fixed', width: 1080, height: 1350 },
  { id: '1x1', label: '1:1', hint: 'Square', kind: 'fixed', width: 1080, height: 1080 },
  { id: '9x16', label: '9:16', hint: 'Story', kind: 'fixed', width: 1080, height: 1920 },
  {
    id: 'original',
    label: 'Original',
    hint: 'X · long edge 2048',
    kind: 'original',
    longEdge: 2048,
  },
] as const satisfies readonly OutputPreset[];

export const DEFAULT_PRESET: OutputPreset = OUTPUT_PRESETS[0];

/** Margin (paper) color of the exported image. Independent of the editor's black theme. */
export type Paper = { id: string; label: string; background: string; ink: string; subInk: string };

export const PAPERS = [
  { id: 'white', label: 'White', background: '#ffffff', ink: '#111111', subInk: '#77756f' },
  { id: 'black', label: 'Black', background: '#0b0b0c', ink: '#f2f0ea', subInk: '#8d8a83' },
] as const satisfies readonly Paper[];

export const DEFAULT_PAPER: Paper = PAPERS[0];
