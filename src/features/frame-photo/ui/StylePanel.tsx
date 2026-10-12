import { HStack, Text } from '@seed-design/react';
import { type ReactNode, useRef } from 'react';

import {
  BACKGROUND_SWATCHES,
  CROPS,
  FONTS,
  type FrameStyle,
  PADDINGS,
  TEMPLATES,
  TEXT_SWATCHES,
} from '@/entities/frame';
import { Button } from '@/shared/ui/Button';
import { PickField } from '@/shared/ui/PickField';
import { Chip } from 'seed-design/ui/chip';
import { SegmentedControl, SegmentedControlItem } from 'seed-design/ui/segmented-control';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import * as css from './FrameEditor.css';

const POSITIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
] as const;

const SIZES = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
] as const;

const ALIGNS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

// Shown in the color well while the color is automatic; the well cannot be empty.
const AUTO_COLOR_WELL = '#111111';

const pickFrom =
  <T extends string | number>(options: readonly { value: T }[], apply: (value: T) => void) =>
  (picked: string) => {
    const match = options.find(option => String(option.value) === picked);
    if (match) apply(match.value);
  };

type ControlProps = { label: string; hint?: string; children: ReactNode };

/** One setting: its name, the control, and an optional line of explanation, spaced as a unit. */
const Control = ({ label, hint, children }: ControlProps) => (
  <div className={css.control}>
    <span className={css.controlLabel}>{label}</span>
    {children}
    {hint && (
      <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
        {hint}
      </Text>
    )}
  </div>
);

type SwatchRowProps = {
  label: string;
  /** Current color, or empty when the automatic choice is in effect. */
  value: string;
  /** What the color well shows while the value is empty. */
  fallback: string;
  swatches: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
};

/** A color well for any color, followed by the few colors most frames use. */
const SwatchRow = ({ label, value, fallback, swatches, onChange }: SwatchRowProps) => (
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

type SectionProps = {
  style: FrameStyle;
  onChange: (patch: Partial<FrameStyle>) => void;
};

/**
 * Picks the template. It comes first in the panel because it decides which sections follow.
 * @param props the current style and its change handler
 */
export const StyleSection = ({ style, onChange }: SectionProps) => {
  const template = TEMPLATES.find(item => item.value === style.template);
  return (
    <fieldset className={css.group}>
      <legend className={css.legend}>Style</legend>
      <div className={css.controls}>
        <Control label="Template" hint={template?.hint}>
          <Chip.RadioRoot
            aria-label="Frame style"
            value={style.template}
            onValueChange={pickFrom(TEMPLATES, value => onChange({ template: value }))}
          >
            <HStack gap="x2" wrap>
              {TEMPLATES.map(item => (
                <Chip.RadioItem key={item.value} value={item.value}>
                  <Chip.Label>{item.label}</Chip.Label>
                </Chip.RadioItem>
              ))}
            </HStack>
          </Chip.RadioRoot>
        </Control>
      </div>
    </fieldset>
  );
};

type FrameSectionProps = SectionProps & {
  /** False when the canvas hugs the photo (Original output), where there is no room to move it. */
  positionApplies: boolean;
};

/**
 * How the photo sits in the canvas: margin color and size, where the photo goes, and the wide
 * cut. Applies to every template.
 * @param props the current style, its change handler, and whether the photo can be moved
 */
export const FrameSection = ({ style, onChange, positionApplies }: FrameSectionProps) => (
  <fieldset className={css.group}>
    <legend className={css.legend}>Frame</legend>
    <div className={css.controls}>
      <Control label="Background">
        <SwatchRow
          label="Background"
          value={style.background}
          fallback={style.background}
          swatches={BACKGROUND_SWATCHES}
          onChange={background => onChange({ background })}
        />
      </Control>

      <Control label="Padding">
        <SegmentedControl
          aria-label="Padding around the photo"
          value={String(style.padding)}
          onValueChange={pickFrom(PADDINGS, padding => onChange({ padding }))}
        >
          {PADDINGS.map(item => (
            <SegmentedControlItem key={item.value} value={String(item.value)}>
              {item.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Control>

      <Control
        label="Photo position"
        hint={
          positionApplies
            ? undefined
            : 'Original output wraps the photo, so there is no room to move it.'
        }
      >
        <SegmentedControl
          aria-label="Photo position"
          value={style.position}
          onValueChange={pickFrom(POSITIONS, position => onChange({ position }))}
        >
          {POSITIONS.map(item => (
            <SegmentedControlItem key={item.value} value={item.value} disabled={!positionApplies}>
              {item.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Control>

      <Control
        label="Wide cut"
        hint={
          style.crop === 'none' ? undefined : 'Cuts the photo to a centered band of this shape.'
        }
      >
        <Chip.RadioRoot
          aria-label="Wide cut"
          value={style.crop}
          onValueChange={pickFrom(CROPS, crop => onChange({ crop }))}
        >
          <HStack gap="x2" wrap>
            {CROPS.map(item => (
              <Chip.RadioItem key={item.value} value={item.value}>
                <Chip.Label>{item.label}</Chip.Label>
              </Chip.RadioItem>
            ))}
          </HStack>
        </Chip.RadioRoot>
      </Control>
    </div>
  </fieldset>
);

type TextSectionProps = SectionProps & {
  hasImage: boolean;
  onImage: (file: File | null) => void;
};

/**
 * The Text template's own line and image. Ordered as it is filled in: what it says, where it
 * goes, then how it is lettered.
 * @param props the current style, its change handler, and the image state
 */
export const TextSection = ({ style, onChange, hasImage, onImage }: TextSectionProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  return (
    <fieldset className={css.group}>
      <legend className={css.legend}>Text</legend>
      <div className={css.controls}>
        <TextField
          size="medium"
          label="Your text"
          indicator="Optional"
          value={style.text}
          onValueChange={({ value }) => onChange({ text: value })}
        >
          <TextFieldInput inputMode="text" placeholder="A title, a place, a name" />
        </TextField>

        <Control
          label="Image"
          hint="Shown beside your text, fitted into a square. It stays on this device and is forgotten when you close the app."
        >
          <div className={css.swatchRow}>
            <input
              ref={imageInputRef}
              className={css.hiddenInput}
              type="file"
              accept="image/*"
              tabIndex={-1}
              onChange={event => {
                onImage(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
            <Button
              size="small"
              className={css.swatch}
              onClick={() => imageInputRef.current?.click()}
            >
              {hasImage ? 'Change' : 'Add image'}
            </Button>
            {hasImage && (
              <Button size="small" className={css.swatch} onClick={() => onImage(null)}>
                Remove
              </Button>
            )}
          </div>
        </Control>
        <Control label="Position" hint="Under the photo.">
          <SegmentedControl
            aria-label="Text position"
            value={style.align}
            onValueChange={pickFrom(ALIGNS, align => onChange({ align }))}
          >
            {ALIGNS.map(item => (
              <SegmentedControlItem key={item.value} value={item.value}>
                {item.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </Control>

        <PickField
          size="medium"
          label="Font"
          value={style.font}
          options={FONTS}
          onChange={pickFrom(FONTS, font => onChange({ font }))}
        />

        <Control label="Size">
          <SegmentedControl
            aria-label="Text size"
            value={style.textSize}
            onValueChange={pickFrom(SIZES, textSize => onChange({ textSize }))}
          >
            {SIZES.map(item => (
              <SegmentedControlItem key={item.value} value={item.value}>
                {item.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </Control>

        <Control label="Color" hint="Auto picks dark or light to suit the background.">
          <SwatchRow
            label="Text color"
            value={style.textColor}
            fallback={AUTO_COLOR_WELL}
            swatches={TEXT_SWATCHES}
            onChange={textColor => onChange({ textColor })}
          />
        </Control>
      </div>
    </fieldset>
  );
};
