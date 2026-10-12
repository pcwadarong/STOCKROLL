import { HStack, Text } from '@seed-design/react';
import { useRef } from 'react';

import {
  BACKGROUND_SWATCHES,
  CROPS,
  FONTS,
  type FrameStyle,
  PADDINGS,
  TEMPLATES,
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

const pickFrom =
  <T extends string | number>(options: readonly { value: T }[], apply: (value: T) => void) =>
  (picked: string) => {
    const match = options.find(option => String(option.value) === picked);
    if (match) apply(match.value);
  };

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
        <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle" aria-live="polite">
          {template?.hint}
        </Text>
      </fieldset>

      <fieldset className={css.group}>
        <legend className={css.legend}>Frame</legend>

        <div className={css.colorRow}>
          <label className={css.colorField}>
            <span className={css.controlLabel}>Background</span>
            <input
              type="color"
              className={css.colorInput}
              value={style.background}
              onChange={event => onChange({ background: event.target.value })}
            />
          </label>
          {BACKGROUND_SWATCHES.map(swatch => (
            <Button
              key={swatch.value}
              size="small"
              pressed={style.background === swatch.value}
              onClick={() => onChange({ background: swatch.value })}
            >
              {swatch.label}
            </Button>
          ))}
        </div>

        <span className={css.controlLabel}>Padding</span>
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

        <span className={css.controlLabel}>Photo position</span>
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
        {!positionApplies && (
          <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
            Original output wraps the photo, so there is no room to move it.
          </Text>
        )}

        <span className={css.controlLabel}>Wide cut</span>
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
        {style.crop !== 'none' && (
          <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
            Cuts the photo to a centered band of this shape. Everything else keeps the whole photo.
          </Text>
        )}
      </fieldset>

      <fieldset className={css.group}>
        <legend className={css.legend}>Text</legend>
        <PickField
          size="medium"
          label="Font"
          value={style.font}
          options={FONTS}
          onChange={pickFrom(FONTS, font => onChange({ font }))}
        />

        <span className={css.controlLabel}>Size</span>
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

        <span className={css.controlLabel}>Alignment</span>
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
        <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
          Applies to single lines, your own text and the logo. Two-sided rows always run edge to
          edge.
        </Text>

        <TextField
          size="medium"
          label="Your text"
          indicator="Optional"
          value={style.text}
          onValueChange={({ value }) => onChange({ text: value })}
        >
          <TextFieldInput inputMode="text" placeholder="A title, a place, a name" />
        </TextField>

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
        <div className={css.queueLinks}>
          <Button variant="plain" onClick={() => logoInputRef.current?.click()}>
            {hasLogo ? 'Change logo' : 'Add logo'}
          </Button>
          {hasLogo && (
            <Button variant="plain" onClick={() => onLogo(null)}>
              Remove logo
            </Button>
          )}
        </div>
        <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
          A small image drawn with the caption. It stays on this device and is forgotten when you
          close the app.
        </Text>
      </fieldset>
    </>
  );
};
