import { HStack, Text } from '@seed-design/react';
import { type DragEvent, useRef, useState } from 'react';

import { OUTPUT_PRESETS, PAPERS } from '@/entities/frame';
import { systemOf, SYSTEMS } from '@/entities/recipe';
import { canShareFiles } from '@/shared/lib/save-file';
import { Button } from '@/shared/ui/Button';
import { ErrorText } from '@/shared/ui/ErrorText';
import { PickField, type PickOption } from '@/shared/ui/PickField';
import { Chip } from 'seed-design/ui/chip';
import { SegmentedControl, SegmentedControlItem } from 'seed-design/ui/segmented-control';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import { FROM_EXIF } from '../lib/resolve-caption';
import { useFrameEditor } from '../model/use-frame-editor';

import * as css from './FrameEditor.css';

const EXPOSURE_FIELDS = [
  { key: 'iso', label: 'ISO', inputMode: 'numeric' },
  { key: 'focal', label: 'Focal length (mm)', inputMode: 'decimal' },
  { key: 'aperture', label: 'Aperture (f/)', inputMode: 'decimal' },
  // Shutter speeds are fractions, so this one stays a text field: 1/250, 0.5, 2
  { key: 'shutter', label: 'Shutter (s)', inputMode: 'text' },
] as const;

const NONE = 'none';
const NONE_OPTION: PickOption = { value: NONE, label: 'None' };

const gearOptions = (
  items: readonly { id: string; name: string }[],
  exifName: string,
): PickOption[] => [
  NONE_OPTION,
  ...(exifName ? [{ value: FROM_EXIF, label: `${exifName} (from EXIF)` }] : []),
  ...items.map(item => ({ value: item.id, label: item.name })),
];

const AddLink = ({ to, children }: { to: string; children: string }) => (
  <Button className={css.fieldAction} variant="plain" to={to}>
    {children}
  </Button>
);

/**
 * Editor that adds a shooting-info frame to a single photo and exports it as JPEG.
 * Preview on the left (top on mobile), settings panel on the right (bottom on mobile).
 * @param props `signedIn` enables the links to register gear and recipes, which need an account
 */
export const FrameEditor = ({ signedIn }: { signedIn: boolean }) => {
  const { canvasRef, store, library, resolved, outputSize, exportJpeg } = useFrameEditor();
  const { source, picks, preset, paper, focalMode, detail, error } = store;
  const { setPick, setPreset, setPaper, setFocalMode, setDetail } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [shareable] = useState(canShareFiles);

  const hasPhoto = source !== null;
  const has35mm = source?.exif.focalLength35 !== undefined;
  const scanner = source?.exif.scanner;
  const hasExif = source !== null && Object.keys(source.exif).length > 0;
  const openPhoto = store.open;
  const openPicker = () => fileInputRef.current?.click();

  /** Maps a dropdown value back to a pick: "None" is an explicit empty choice. */
  const pick = (key: 'camera' | 'lens' | 'film' | 'look') => (value: string) =>
    setPick(key, value === NONE ? '' : value);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void openPhoto(event.dataTransfer.files[0]);
  };

  return (
    <main className={css.root}>
      <section
        aria-label="Preview"
        className={dragging ? `${css.stage} ${css.stageDragging}` : css.stage}
        onDragOver={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {hasPhoto ? (
          <canvas
            ref={canvasRef}
            className={css.preview}
            role="img"
            aria-label="Preview of the framed photo"
          />
        ) : (
          <div className={css.empty}>
            <Text as="p" textStyle="t5Regular" color="fg.neutralMuted">
              Drop an edited photo here or open one. Photos are processed on this device only and
              are never uploaded.
            </Text>
            <Button variant="primary" onClick={openPicker}>
              Open photo
            </Button>
          </div>
        )}
      </section>

      <aside className={css.panel} aria-label="Frame settings">
        <input
          ref={fileInputRef}
          className={css.hiddenInput}
          type="file"
          accept="image/*"
          tabIndex={-1}
          onChange={event => {
            void openPhoto(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        {error && <ErrorText>{error}</ErrorText>}

        <fieldset className={css.group}>
          <legend className={css.legend}>Output</legend>
          {/* Five ratios overflow a SegmentedControl in the narrow panel; chips wrap instead. */}
          <Chip.RadioRoot
            aria-label="Output ratio"
            value={preset.id}
            onValueChange={id => {
              const next = OUTPUT_PRESETS.find(item => item.id === id);
              if (next) setPreset(next);
            }}
          >
            <HStack gap="x2" wrap>
              {OUTPUT_PRESETS.map(item => (
                <Chip.RadioItem key={item.id} value={item.id}>
                  <Chip.Label>{item.label}</Chip.Label>
                </Chip.RadioItem>
              ))}
            </HStack>
          </Chip.RadioRoot>
          <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle" aria-live="polite">
            {preset.hint}
            {outputSize && ` · ${outputSize.width}×${outputSize.height}`}
          </Text>
        </fieldset>

        <fieldset className={css.group}>
          <legend className={css.legend}>File</legend>
          <SegmentedControl
            aria-label="File size"
            value={detail}
            onValueChange={value => setDetail(value === 'full' ? 'full' : 'optimized')}
          >
            <SegmentedControlItem value="optimized">Optimized</SegmentedControlItem>
            <SegmentedControlItem value="full">Full size</SegmentedControlItem>
          </SegmentedControl>
          <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
            {detail === 'full'
              ? 'Keeps the photo at its own resolution. Larger file.'
              : 'Sized for posting. Smaller file, quick to upload.'}
          </Text>
        </fieldset>

        <fieldset className={css.group}>
          <legend className={css.legend}>Margin</legend>
          <SegmentedControl
            aria-label="Margin color"
            value={paper.id}
            onValueChange={id => {
              const next = PAPERS.find(item => item.id === id);
              if (next) setPaper(next);
            }}
          >
            {PAPERS.map(item => (
              <SegmentedControlItem key={item.id} value={item.id}>
                {item.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </fieldset>

        <fieldset className={css.group}>
          <legend className={css.legend}>Focal length</legend>
          <SegmentedControl
            aria-label="Focal length display"
            value={focalMode}
            onValueChange={mode => setFocalMode(mode === '35mm' ? '35mm' : 'actual')}
          >
            <SegmentedControlItem value="actual">Actual</SegmentedControlItem>
            <SegmentedControlItem value="35mm" disabled={!has35mm}>
              35mm equiv.
            </SegmentedControlItem>
          </SegmentedControl>
          {hasPhoto && !has35mm && (
            <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
              This file has no 35mm-equivalent focal length recorded.
            </Text>
          )}
        </fieldset>

        <fieldset className={css.group}>
          <legend className={css.legend}>Info</legend>
          {!signedIn && (
            <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
              Sign in to pick from your own cameras, lenses, films and recipes.
            </Text>
          )}
          {scanner && (
            <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
              This file was written by a scanner ({scanner}), so it has no camera info. Enter the
              camera and film yourself.
            </Text>
          )}
          <div className={css.field}>
            <PickField
              label="Camera"
              indicator={picks.camera === undefined && resolved.cameraValue ? 'Auto' : undefined}
              value={resolved.cameraValue || NONE}
              options={gearOptions(library.cameras, resolved.exifCamera)}
              onChange={pick('camera')}
            />
            {signedIn && <AddLink to="/library/cameras/new">Add camera</AddLink>}
          </div>

          <div className={css.field}>
            <PickField
              label="Lens"
              indicator={picks.lens === undefined && resolved.lensValue ? 'Auto' : undefined}
              value={resolved.lensValue || NONE}
              options={gearOptions(library.lenses, resolved.exifLens)}
              onChange={pick('lens')}
            />
            {signedIn && <AddLink to="/library/lenses/new">Add lens</AddLink>}
          </div>

          <div className={css.field}>
            <div className={css.exposure}>
              {EXPOSURE_FIELDS.map(({ key, label, inputMode }) => (
                <TextField
                  key={key}
                  label={label}
                  indicator={picks[key] !== undefined ? 'Manual' : undefined}
                  value={resolved.exposure[key]}
                  onValueChange={({ value }) => setPick(key, value)}
                >
                  <TextFieldInput inputMode={inputMode} placeholder="—" />
                </TextField>
              ))}
            </div>
            {EXPOSURE_FIELDS.some(({ key }) => picks[key] !== undefined) && hasExif && (
              <Button
                className={css.fieldAction}
                variant="plain"
                onClick={() => EXPOSURE_FIELDS.forEach(({ key }) => setPick(key, undefined))}
              >
                Reset exposure to EXIF
              </Button>
            )}
          </div>

          {resolved.lookField === 'film' && (
            <div className={css.field}>
              <PickField
                label="Film"
                value={resolved.filmValue || NONE}
                options={[
                  NONE_OPTION,
                  ...library.films.map(film => ({ value: film.id, label: film.name })),
                ]}
                onChange={pick('film')}
              />
              {signedIn && <AddLink to="/library/films/new">Add film</AddLink>}
            </div>
          )}

          {resolved.lookField === 'recipe' && (
            <div className={css.field}>
              <PickField
                label={SYSTEMS[resolved.system].lookLabel}
                description="A label for your records. It does not change the photo's colors."
                value={resolved.lookValue || NONE}
                options={[
                  NONE_OPTION,
                  ...library.recipes
                    .filter(recipe => systemOf(recipe) === resolved.system)
                    .map(recipe => ({
                      value: `recipe:${recipe.id}`,
                      label: `${recipe.name} (recipe)`,
                    })),
                  ...SYSTEMS[resolved.system].baseLooks.map(name => ({
                    value: `sim:${name}`,
                    label: name,
                  })),
                ]}
                onChange={pick('look')}
              />
              {signedIn && <AddLink to="/recipes">Manage recipes</AddLink>}
            </div>
          )}

          {resolved.lookField === 'none' && hasPhoto && (
            <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
              Pick a camera to add its film or recipe.
            </Text>
          )}
        </fieldset>

        <div className={css.actions}>
          {hasPhoto && <Button onClick={openPicker}>Change photo</Button>}
          {shareable && (
            <Button disabled={!hasPhoto} onClick={() => void exportJpeg('share')}>
              Share
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!hasPhoto}
            onClick={() => void exportJpeg('download')}
          >
            Save JPEG
          </Button>
        </div>
      </aside>
    </main>
  );
};
