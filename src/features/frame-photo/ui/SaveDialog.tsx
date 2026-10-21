import IconXmarkLine from '@karrotmarket/react-monochrome-icon/IconXmarkLine';
import { Checkbox, Dialog, Icon } from '@seed-design/react';
import { useEffect, useRef, useState } from 'react';

import type { BatchSaveWay } from '@/shared/lib/save-file';
import { Button } from '@/shared/ui/Button';
import { Checkmark } from 'seed-design/ui/checkbox';

import {
  preparingText,
  type SaveProgress,
  saveWayText,
  savingProgressText,
  shareButtonText,
  shareReadyText,
} from '../lib/batch-text';
import type { QueuedPhoto } from '../model/editor-store';

import * as css from './SaveDialog.css';

const count = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`;

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
  /** How this browser saves a batch. */
  way: BatchSaveWay;
  /** The photos the next tap hands to the share sheet, and how many wait in all; or null. */
  ready: { start: number; end: number; total: number } | null;
  /** How many of the chosen photos are made ahead for the share sheet, or null. */
  preparedCount: { done: number; total: number } | null;
  /** Called with the chosen photos whenever the choice changes, to make them ahead. */
  onChoose: (ids: readonly string[]) => void;
  onSave: (ids: readonly string[], way: BatchSaveWay) => void;
  onShare: () => void;
  onStop: () => void;
};

const SaveChoice = ({
  photos,
  currentId,
  saving,
  way,
  ready,
  preparedCount,
  onChoose,
  onSave,
  onShare,
  onStop,
}: SaveChoiceProps) => {
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(currentId ? [currentId] : []),
  );
  const ids = photos.filter(photo => checked.has(photo.id)).map(photo => photo.id);
  const chosen = ids.join(' ');
  // Only the share sheet needs its photos made before the tap: the others can make them after.
  useEffect(() => {
    if (way === 'share') onChoose(chosen ? chosen.split(' ') : []);
    // `onChoose` is a new function every render; the choice is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen, way]);
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

          {!saving && !ready && <p className={css.note}>{saveWayText(way)}</p>}
          {/* Quiet: counting up out loud would talk over the photo list. */}
          {!saving && !ready && preparedCount && preparedCount.total > 0 && (
            <p className={css.note}>{preparingText(preparedCount)}</p>
          )}
          {ready && (
            <p className={css.note} role="status">
              {shareReadyText(ready)}
            </p>
          )}
          {/* A folder is the better place on this browser; a ZIP is still there for sending on. */}
          {!saving && !ready && way === 'folder' && (
            <Button variant="plain" disabled={ids.length === 0} onClick={() => onSave(ids, 'zip')}>
              Download as one ZIP instead
            </Button>
          )}
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <div className={css.footer}>
          {/* One button for every state, so keyboard focus stays put as the run moves on. The
              share sheet opens only straight after a tap, so a made batch waits for this one. */}
          <Button
            variant="primary"
            disabled={!saving && !ready && ids.length === 0}
            onClick={saving ? onStop : ready ? onShare : () => onSave(ids, way)}
          >
            {saving ? 'Stop saving' : ready ? shareButtonText(ready) : `Save ${count(ids.length)}`}
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
