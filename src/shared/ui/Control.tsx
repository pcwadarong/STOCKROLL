import { Text, VisuallyHidden } from '@seed-design/react';
import { type ReactNode, useId, useRef } from 'react';

import { Button } from './Button';

import * as css from './Control.css';

type ControlProps = {
  label: string;
  /** A line under the control, for what the screen does not already show. */
  hint?: string;
  /**
   * What the preview shows the eye but a screen reader cannot get from a canvas: read to
   * assistive tech only, and announced when it changes.
   */
  quietHint?: string;
  children: ReactNode;
};

/**
 * One setting: its name, the control, and an optional line of explanation, spaced as a unit.
 * The name and both hints are tied to the group, so assistive tech reads them on entering it.
 * @param props the setting's name, an optional visible hint, an optional hint for assistive tech
 *   only, and the control itself
 */
export const Control = ({ label, hint, quietHint, children }: ControlProps) => {
  const id = useId();
  const described = [hint && `${id}-hint`, quietHint && `${id}-quiet`].filter(Boolean).join(' ');
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={described || undefined}
      className={css.control}
    >
      <span id={`${id}-label`} className={css.controlLabel}>
        {label}
      </span>
      {children}
      {hint && (
        <Text as="p" id={`${id}-hint`} textStyle="t3Regular" color="fg.neutralSubtle">
          {hint}
        </Text>
      )}
      {quietHint && (
        <VisuallyHidden id={`${id}-quiet`} aria-live="polite">
          {quietHint}
        </VisuallyHidden>
      )}
    </div>
  );
};

type SwatchRowProps = {
  label: string;
  /** Current color, or empty when the automatic choice is in effect. */
  value: string;
  /** What the color well shows while the value is empty. */
  fallback: string;
  swatches: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
};

/**
 * A color well for any color, followed by the few colors most outputs use.
 * @param props what the color is for, its value, the presets and the change handler
 */
export const SwatchRow = ({ label, value, fallback, swatches, onChange }: SwatchRowProps) => (
  <div className={css.swatchRow}>
    <input
      type="color"
      className={css.colorInput}
      aria-label={`${label}: pick any color`}
      value={value || fallback}
      onChange={event => onChange(event.target.value)}
    />
    {swatches.map(swatch => (
      <Button
        key={swatch.label}
        size="small"
        className={css.swatch}
        pressed={value === swatch.value}
        onClick={() => onChange(swatch.value)}
      >
        {swatch.label}
      </Button>
    ))}
  </div>
);

type ImagePickProps = {
  hasImage: boolean;
  /** Called with the chosen file, or `null` to remove the image. */
  onImage: (file: File | null) => void;
};

/**
 * Buttons that attach an image file of the user's own, replace it, or remove it.
 * @param props whether an image is attached and the handler for a new choice
 */
export const ImagePick = ({ hasImage, onImage }: ImagePickProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={css.swatchRow}>
      <input
        ref={inputRef}
        className={css.hiddenInput}
        type="file"
        accept="image/*"
        tabIndex={-1}
        onChange={event => {
          onImage(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />
      <Button size="small" className={css.swatch} onClick={() => inputRef.current?.click()}>
        {hasImage ? 'Change' : 'Add image'}
      </Button>
      {hasImage && (
        <Button size="small" className={css.swatch} onClick={() => onImage(null)}>
          Remove
        </Button>
      )}
    </div>
  );
};
