import IconXmarkLine from '@karrotmarket/react-monochrome-icon/IconXmarkLine';
import { Checkbox, Dialog, Icon } from '@seed-design/react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/Button';
import { Checkmark } from 'seed-design/ui/checkbox';

import { MULTIPLE_DOWNLOADS_HINT, type SaveProgress, savingProgressText } from '../lib/batch-text';
import type { QueuedPhoto } from '../model/editor-store';

import * as css from './SaveDialog.css';

const Thumbnail = ({ photo }: { photo: QueuedPhoto }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { thumbnail } = photo;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = thumbnail.width;
    canvas.height = thumbnail.height;
    canvas.getContext('2d')?.drawImage(thumbnail, 0, 0);
  }, [thumbnail]);

  // Decorative: the checkbox over it already names the photo.
  return <canvas ref={canvasRef} className={css.thumbnail} aria-hidden="true" />;
};

type SaveChoiceProps = {
  photos: readonly QueuedPhoto[];
  /** The photo in the preview, which starts out as the only one checked. */
  currentId: string | null;
  /** Progress of the run in flight, or null when none is running. */
  saving: SaveProgress | null;
  onSave: (ids: readonly string[]) => void;
  onStop: () => void;
};

const SaveChoice = ({ photos, currentId, saving, onSave, onStop }: SaveChoiceProps) => {
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(currentId ? [currentId] : []),
  );
  const ids = photos.filter(photo => checked.has(photo.id)).map(photo => photo.id);
  const toggle = (id: string, on: boolean) => {
    const next = new Set(checked);
    if (on) next.add(id);
    else next.delete(id);
    setChecked(next);
  };

  return (
    <>
      <Dialog.Body>
        <div className={css.body}>
          {saving ? (
            <>
              <progress
                className={css.progress}
                aria-label="Photos saved"
                value={saving.current - 1}
                max={saving.total}
              />
              <p className={css.note} role="status">
                {savingProgressText(saving)}
              </p>
            </>
          ) : (
            <div className={css.toolbar}>
              <Button variant="plain" onClick={() => setChecked(new Set(photos.map(p => p.id)))}>
                Select all
              </Button>
              <Button variant="plain" onClick={() => setChecked(new Set())}>
                Clear
              </Button>
              <span className={css.count} aria-live="polite">
                {ids.length} of {photos.length} selected
              </span>
            </div>
          )}

          {/* Frozen while a run is in flight: it saves the photos it started with. */}
          <ul className={css.list} aria-label="Photos to save" inert={saving !== null}>
            {photos.map(photo => (
              <li key={photo.id}>
                {/* The whole picture is the checkbox: its mark sits in the top left corner. */}
                <Checkbox.Root.Primitive
                  className={css.tile}
                  checked={checked.has(photo.id)}
                  onCheckedChange={on => toggle(photo.id, on)}
                >
                  <Thumbnail photo={photo} />
                  <span className={css.mark}>
                    <Checkmark tone="neutral" />
                  </span>
                  <Checkbox.HiddenInput aria-label={photo.file.name} />
                </Checkbox.Root.Primitive>
              </li>
            ))}
          </ul>

          {ids.length > 1 && <p className={css.note}>{MULTIPLE_DOWNLOADS_HINT}</p>}
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <div className={css.footer}>
          {/* One button for both states, so keyboard focus stays put when the run starts. */}
          <Button
            variant="primary"
            disabled={!saving && ids.length === 0}
            onClick={saving ? onStop : () => onSave(ids)}
          >
            {saving ? 'Stop saving' : `Save ${ids.length} ${ids.length === 1 ? 'photo' : 'photos'}`}
          </Button>
        </div>
      </Dialog.Footer>
    </>
  );
};

type SaveDialogProps = SaveChoiceProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Asks which of the opened photos to save: the photos laid out as small pictures, each one a
 * checkbox with its mark in the corner, in a body that scrolls. The photo in the preview starts out checked. While the run is in flight the dialog
 * shows how far it is and offers to stop it; closing the dialog does not stop the run.
 * @param props open state, the opened photos, the current photo, the run's progress, and the
 * handlers that start and stop a run
 */
export const SaveDialog = ({ open, onOpenChange, ...choice }: SaveDialogProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange} closeOnInteractOutside={false}>
    <Dialog.Positioner>
      <Dialog.Backdrop />
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Save photos</Dialog.Title>
          <Dialog.CloseButton aria-label="Close">
            <Icon svg={<IconXmarkLine />} />
          </Dialog.CloseButton>
        </Dialog.Header>
        {/* Mounted per opening, so each time starts from the photo now in the preview. */}
        {open && <SaveChoice {...choice} />}
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
);
