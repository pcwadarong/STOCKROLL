import { HStack, Text } from '@seed-design/react';
import { type DragEvent, useRef, useState } from 'react';

import { OUTPUT_PRESETS } from '@/entities/frame';
import { systemOf, SYSTEMS } from '@/entities/recipe';
import { canShareFiles } from '@/shared/lib/save-file';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ErrorText } from '@/shared/ui/ErrorText';
import { PickField, type PickOption } from '@/shared/ui/PickField';
import { Chip } from 'seed-design/ui/chip';
import { SegmentedControl, SegmentedControlItem } from 'seed-design/ui/segmented-control';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import {
  decodeErrorText,
  editorStatusText,
  MULTIPLE_DOWNLOADS_HINT,
  previewStateOf,
} from '../lib/batch-text';
import { BROWSER_CAPTURE_HINT } from '../lib/capture-hint';
import { FROM_EXIF } from '../lib/resolve-caption';
import { useFrameEditor } from '../model/use-frame-editor';

import { PhotoStrip } from './PhotoStrip';
import { StylePanel } from './StylePanel';

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
 * Editor that adds a shooting-info frame to one or more photos and exports them as JPEG.
 * Preview and thumbnail strip on the left (top on mobile), settings panel on the right (bottom on
 * mobile). Output settings are shared by every opened photo; the info fields edit the current one.
 * @param props `signedIn` enables the links to register gear and recipes, which need an account
 */
export const FrameEditor = ({ signedIn }: { signedIn: boolean }) => {
  const { canvasRef, store, library, resolved, outputSize, exportJpeg, saveAll } = useFrameEditor();
  const { queue, current, bitmap, preset, style, logo, focalMode, detail, error } = store;
  const { setPick, setPreset, updateStyle, setLogoFile, setFocalMode, setDetail } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [shareable] = useState(canShareFiles);
  const [asking, setAsking] = useState<'clear' | 'apply' | null>(null);

  const photos = queue.items;
  const picks = current?.picks ?? {};
  const hasPhoto = current !== null;
  const many = photos.length > 1;
  const saving = store.saving !== null;
  // Exporting the current photo needs its full-size bitmap, which "Save all" borrows.
  const preview = previewStateOf({
    hasPhoto,
    hasBitmap: bitmap !== null,
    decodeFailed: store.decodeFailed,
    saving,
  });
  const ready = preview === 'ready';
  const has35mm = current?.exif.focalLength35 !== undefined;
  const scanner = current?.exif.scanner;
  const hasExif = current !== null && Object.keys(current.exif).length > 0;
  const openPicker = () => fileInputRef.current?.click();
  const status = editorStatusText({
    saving: store.saving,
    reading: store.reading,
    loading: preview === 'loading',
    message: store.message,
  });

  /** Maps a dropdown value back to a pick: "None" is an explicit empty choice. */
  const pick = (key: 'camera' | 'lens' | 'film' | 'look') => (value: string) =>
    setPick(key, value === NONE ? '' : value);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    // The queue is being exported; photos dropped now would join a run that never saves them.
    if (!saving) void store.open(Array.from(event.dataTransfer.files));
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
        {current && preview === 'failed' ? (
          // Replaces the canvas: its last frame belongs to another photo and must not stay under
          // this one's name.
          <div className={css.empty}>
            <ErrorText>{decodeErrorText(current.file.name)}</ErrorText>
            <div className={css.queueActions}>
              <Button variant="primary" onClick={store.retryDecode}>
                Try again
              </Button>
              <Button onClick={() => store.remove(current.id)}>Remove this photo</Button>
            </div>
          </div>
        ) : current ? (
          // Sized 0x0 until the first frame is drawn, so no empty box shows while a photo decodes.
          <canvas
            ref={canvasRef}
            className={ready ? css.preview : `${css.preview} ${css.previewBusy}`}
            width={0}
            height={0}
            role="img"
            aria-label={`Preview of the framed photo: ${current.file.name}`}
            aria-busy={preview !== 'ready'}
          />
        ) : (
          <div className={css.empty}>
            <Text as="p" textStyle="t5Regular" color="fg.neutralMuted">
              Drop edited photos here or open them. Photos are processed on this device only and are
              never uploaded.
            </Text>
            <Button variant="primary" onClick={openPicker}>
              Open photos
            </Button>
          </div>
        )}
        <p className={css.status} role="status" aria-live="polite">
          {status}
        </p>
        {many && (
          <PhotoStrip
            photos={photos}
            currentId={queue.currentId}
            disabled={saving}
            onSelect={store.select}
          />
        )}
      </section>

      <aside className={css.panel} aria-label="Frame settings">
        <input
          ref={fileInputRef}
          className={css.hiddenInput}
          type="file"
          accept="image/*"
          multiple
          tabIndex={-1}
          onChange={event => {
            void store.open(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />

        {error && <ErrorText>{error}</ErrorText>}

        {/* Settings are frozen while "Save all" runs: the run uses the values it started with. */}
        <div className={css.settings} inert={saving}>
          {current && (
            <fieldset className={css.group}>
              <legend className={css.legend}>Photos</legend>
              <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle" className={css.fileName}>
                {many && `${photos.indexOf(current) + 1} of ${photos.length} · `}
                {current.file.name}
              </Text>
              {current.browserCapture && (
                <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
                  {BROWSER_CAPTURE_HINT}
                </Text>
              )}
              {/* Text links, not boxes: these are housekeeping and should not outweigh the settings. */}
              <div className={css.queueLinks}>
                <Button variant="plain" onClick={openPicker}>
                  Add photos
                </Button>
                <Button variant="plain" onClick={() => store.remove(current.id)}>
                  Remove
                </Button>
                {many && (
                  <Button variant="plain" onClick={() => setAsking('clear')}>
                    Clear all
                  </Button>
                )}
              </div>
            </fieldset>
          )}

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
                ? 'Keeps the photo at its own resolution, up to the largest image a browser can draw. Larger file.'
                : 'Sized for posting. Smaller file, quick to upload.'}
            </Text>
          </fieldset>

          <StylePanel
            style={style}
            onChange={updateStyle}
            hasLogo={logo !== null}
            onLogo={file => void setLogoFile(file)}
            positionApplies={preset.kind !== 'original'}
          />

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
            {!has35mm && (
              <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
                {hasPhoto
                  ? 'This file has no 35mm-equivalent focal length recorded, so only the actual value is available.'
                  : '35mm equivalent becomes available when the opened photo records it.'}
              </Text>
            )}
          </fieldset>

          <fieldset className={css.group}>
            <legend className={css.legend}>Info</legend>
            {many && (
              <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
                These choices belong to the photo in the preview. Every photo starts from its own
                EXIF.
              </Text>
            )}
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
                size="medium"
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
                size="medium"
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
                    size="medium"
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
                  size="medium"
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
                  size="medium"
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

            {many && (
              <Button
                className={css.fieldAction}
                variant="plain"
                onClick={() => setAsking('apply')}
              >
                Apply to all photos
              </Button>
            )}
          </fieldset>
        </div>

        {many && (
          <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
            {MULTIPLE_DOWNLOADS_HINT}
          </Text>
        )}

        <div className={css.actions}>
          {shareable && (
            <Button
              className={css.action}
              disabled={!ready}
              onClick={() => void exportJpeg('share')}
            >
              Share
            </Button>
          )}
          <Button
            className={css.action}
            variant={many ? 'secondary' : 'primary'}
            disabled={!ready}
            onClick={() => void exportJpeg('download')}
          >
            Save JPEG
          </Button>
          {many && (
            // One button for both states, so keyboard focus stays put when the run starts.
            <Button
              className={css.actionWide}
              variant="primary"
              onClick={saving ? store.stopSaving : () => void saveAll()}
            >
              {saving ? 'Stop saving' : `Save all ${photos.length} photos`}
            </Button>
          )}
        </div>
      </aside>

      <ConfirmDialog
        open={asking === 'apply'}
        onOpenChange={open => setAsking(open ? 'apply' : null)}
        title="Apply to all photos?"
        actions={[
          {
            label: 'Apply to all',
            primary: true,
            onSelect: () => {
              store.applyGearToAll();
              store.setMessage(`Applied to all ${photos.length} photos.`);
            },
          },
        ]}
      >
        The camera, lens, film and look chosen for this photo replace what the other{' '}
        {photos.length - 1} have. A field left on auto stays auto, so each photo keeps reading its
        own EXIF. Exposure values are not copied.
      </ConfirmDialog>

      <ConfirmDialog
        open={asking === 'clear'}
        onOpenChange={open => setAsking(open ? 'clear' : null)}
        title="Clear all photos?"
        actions={[{ label: 'Clear all', primary: true, onSelect: store.clear }]}
      >
        All {photos.length} photos leave the editor, along with the info chosen for them. The files
        on this device are not touched.
      </ConfirmDialog>
    </main>
  );
};
