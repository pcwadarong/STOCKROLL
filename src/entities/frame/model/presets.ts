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
