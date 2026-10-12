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
  withTemplate,
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

type StylePanelProps = {
  style: FrameStyle;
  onChange: (patch: Partial<FrameStyle>) => void;
  hasLogo: boolean;
  onLogo: (file: File | null) => void;
  /** False when the canvas hugs the photo (Original output), where there is no room to move it. */
  positionApplies: boolean;
};

/**
 * The look of the frame: template, margin, crop and lettering. Shared by every opened photo.
 * @param props the current style, its change handler, and the logo state
 */
export const StylePanel = ({
  style,
  onChange,
  hasLogo,
  onLogo,
  positionApplies,
}: StylePanelProps) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const template = TEMPLATES.find(item => item.value === style.template);

  return (
    <>
      <fieldset className={css.group}>
        <legend className={css.legend}>Style</legend>
        <div className={css.controls}>
          <Control label="Template" hint={template?.hint}>
            <Chip.RadioRoot
              aria-label="Frame style"
              value={style.template}
              onValueChange={pickFrom(TEMPLATES, value => onChange(withTemplate(style, value)))}
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
                <SegmentedControlItem
                  key={item.value}
                  value={item.value}
                  disabled={!positionApplies}
                >
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

      <fieldset className={css.group}>
        <legend className={css.legend}>Text</legend>
        <div className={css.controls}>
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

          <Control label="Alignment" hint="Two-sided rows always run edge to edge.">
            <SegmentedControl
              aria-label="Text alignment"
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

          <Control label="Color" hint="Auto follows the template and the background.">
            <SwatchRow
              label="Text color"
              value={style.textColor}
              fallback={AUTO_COLOR_WELL}
              swatches={TEXT_SWATCHES}
              onChange={textColor => onChange({ textColor })}
            />
          </Control>

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
            label="Logo"
            hint="A small image drawn with the caption. It stays on this device and is forgotten when you close the app."
          >
            <div className={css.swatchRow}>
              <input
                ref={logoInputRef}
                className={css.hiddenInput}
                type="file"
                accept="image/*"
                tabIndex={-1}
                onChange={event => {
                  onLogo(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
              <Button
                size="small"
                className={css.swatch}
                onClick={() => logoInputRef.current?.click()}
              >
                {hasLogo ? 'Change' : 'Add image'}
              </Button>
              {hasLogo && (
                <Button size="small" className={css.swatch} onClick={() => onLogo(null)}>
                  Remove
                </Button>
              )}
            </div>
          </Control>
        </div>
      </fieldset>
    </>
  );
};
