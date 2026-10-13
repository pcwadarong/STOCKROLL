import { Text } from '@seed-design/react';
import { type ReactNode, useState } from 'react';

import { FONTS } from '@/shared/lib/canvas-fonts';
import { Control, ImagePick, SwatchRow } from '@/shared/ui/Control';
import { controls } from '@/shared/ui/Control.css';
import { ErrorText } from '@/shared/ui/ErrorText';
import { PickField } from '@/shared/ui/PickField';
import { SegmentedControl, SegmentedControlItem } from 'seed-design/ui/segmented-control';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import {
  hasMark,
  insidePosition,
  MARK_SIZES,
  MARK_SOURCES,
  MARK_SWATCHES,
  type MarkLine,
  overlayArea,
} from '../model/mark';
import { useMark } from '../model/use-mark';

import { PlacePicker } from './PlacePicker';

// Shown in the color well while the color is automatic; the well cannot be empty.
const AUTO_COLOR_WELL = '#ffffff';

const SECOND_LINE_SOURCES = [{ value: 'none', label: 'None' }, ...MARK_SOURCES] as const;
const pickFrom =
  <T extends string | number>(options: readonly { value: T }[], apply: (value: T) => void) =>
  (picked: string) => {
    const match = options.find(option => String(option.value) === picked);
    if (match) apply(match.value);
  };

type SegmentsProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
};

const Segments = <T extends string>({ label, value, options, onChange }: SegmentsProps<T>) => (
  <SegmentedControl aria-label={label} value={value} onValueChange={pickFrom(options, onChange)}>
    {options.map(item => (
      <SegmentedControlItem key={item.value} value={item.value}>
        {item.label}
      </SegmentedControlItem>
    ))}
  </SegmentedControl>
);

type MarkFieldsProps = {
  /**
   * Given when the picture is drawn by a template that can place the text itself: where that
   * template puts it (empty when it has no place), whether it letters the text the user's way,
   * and any control of the template's own for that place.
   */
  template?: { hint: string; lettered: boolean; controls?: ReactNode };
  /** False where pictures record no shooting date, so a date line is left out. */
  dated?: boolean;
};

/**
 * The settings of the user's own text: what it says, then where it goes, then how it looks.
 * Placement and look are offered once there is something to place. The same text is used by
 * every screen that exports a picture, so this reads and writes the shared setting itself.
 * @param props what the screen's picture can do with the text: a template place, a shooting date
 */
export const MarkFields = ({ template, dated = true }: MarkFieldsProps) => {
  const { mark, image, update, setImageFile } = useMark();
  const [error, setError] = useState('');

  const setLine = (index: 0 | 1, patch: Partial<MarkLine>) => {
    const lines: [MarkLine, MarkLine] = [mark.lines[0], mark.lines[1]];
    lines[index] = { ...lines[index], ...patch };
    update({ lines });
  };
  const onImage = (file: File | null) => {
    setError('');
    setImageFile(file).catch(() => setError('Could not read that image. Try a PNG or JPEG.'));
  };

  // A screen with no template shows a template mark where it draws it: over the whole picture.
  const area = template ? mark.area : (overlayArea(mark.area, false) ?? 'image');
  // Inside the photo, above and below it mean its top and bottom edge.
  const position = area === 'image' ? mark.position : insidePosition(mark.position);
  const placedByTemplate = area === 'template';
  const usesDate = mark.lines.some(line => line.source.startsWith('date'));

  return (
    <div className={controls}>
      {([0, 1] as const).map(index => (
        <Control key={index} label={`Line ${index + 1}`}>
          <PickField
            size="medium"
            hideLabel
            label={`Line ${index + 1}: what it says`}
            value={mark.lines[index].source}
            options={index === 0 ? MARK_SOURCES : SECOND_LINE_SOURCES}
            onChange={pickFrom(SECOND_LINE_SOURCES, source => setLine(index, { source }))}
          />
          {mark.lines[index].source === 'custom' && (
            <TextField
              size="medium"
              value={mark.lines[index].text}
              onValueChange={({ value }) => setLine(index, { text: value })}
            >
              <TextFieldInput
                aria-label={`Line ${index + 1} text`}
                inputMode="text"
                placeholder={index === 0 ? 'A title, a place, your name' : 'A second line'}
              />
            </TextField>
          )}
        </Control>
      ))}
      {usesDate && (
        <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
          {dated
            ? 'The date line is printed only on photos whose file records when they were taken.'
            : 'Recipe cards record no shooting date, so the date line is left out here.'}
        </Text>
      )}

      <Control
        label="Image"
        hint="Set beside the text. It stays on this device and is forgotten when you close the app."
      >
        <ImagePick hasImage={image !== null} onImage={onImage} />
        {error && <ErrorText>{error}</ErrorText>}
      </Control>

      {hasMark(mark, image !== null) && (
        <>
          <Control label="Place">
            <PlacePicker
              area={area}
              position={position}
              templateHint={template?.hint}
              onChange={update}
            />
            {placedByTemplate && template?.controls}
          </Control>

          {(!placedByTemplate || template?.lettered) && (
            <>
              <PickField
                size="medium"
                label="Font"
                value={mark.font}
                options={FONTS}
                onChange={pickFrom(FONTS, font => update({ font }))}
              />

              <Control label="Size" hint="Sizes the text and the image together.">
                <Segments
                  label="Text size"
                  value={mark.size}
                  options={MARK_SIZES}
                  onChange={size => update({ size })}
                />
              </Control>

              <Control
                label="Color"
                hint="Auto picks dark or light to suit what is behind the text."
              >
                <SwatchRow
                  label="Text color"
                  value={mark.color}
                  fallback={AUTO_COLOR_WELL}
                  swatches={MARK_SWATCHES}
                  onChange={color => update({ color })}
                />
              </Control>
            </>
          )}
        </>
      )}
    </div>
  );
};
