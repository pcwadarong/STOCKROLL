import { HStack } from '@seed-design/react';

import { BACKGROUND_SWATCHES, CROPS, type FrameStyle, PADDINGS, TEMPLATES } from '@/entities/frame';
import { Control, SwatchRow } from '@/shared/ui/Control';
import { controls } from '@/shared/ui/Control.css';
import { Chip } from 'seed-design/ui/chip';
import { SegmentedControl, SegmentedControlItem } from 'seed-design/ui/segmented-control';

import * as css from './FrameEditor.css';

const POSITIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
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
      <div className={controls}>
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
    <div className={controls}>
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

/**
 * Where the Text template sets the user's lines and image under the photo. Shown with the text
 * settings while that template places them.
 * @param props the current style and its change handler
 */
export const TextPlaceControl = ({ style, onChange }: SectionProps) => (
  <SegmentedControl
    aria-label="Text position under the photo"
    value={style.align}
    onValueChange={pickFrom(ALIGNS, align => onChange({ align }))}
  >
    {ALIGNS.map(item => (
      <SegmentedControlItem key={item.value} value={item.value}>
        {item.label}
      </SegmentedControlItem>
    ))}
  </SegmentedControl>
);
