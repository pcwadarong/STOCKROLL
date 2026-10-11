import { useEffect, useRef } from 'react';

import type { QueuedPhoto } from '../model/editor-store';

import * as css from './PhotoStrip.css';

type ThumbProps = {
  photo: QueuedPhoto;
  label: string;
  current: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
};

const Thumb = ({ photo, label, current, disabled, onSelect }: ThumbProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { thumbnail } = photo;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = thumbnail.width;
    canvas.height = thumbnail.height;
    canvas.getContext('2d')?.drawImage(thumbnail, 0, 0);
  }, [thumbnail]);

  // Newly opened photos land at the end of the strip, which may be scrolled out of view.
  useEffect(() => {
    if (current) buttonRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current]);

  return (
    <li className={css.item}>
      <button
        ref={buttonRef}
        type="button"
        className={css.thumbButton}
        aria-label={label}
        aria-current={current ? 'true' : undefined}
        disabled={disabled}
        onClick={() => onSelect(photo.id)}
      >
        {/* Decorative: the button's label already names the photo. */}
        <canvas ref={canvasRef} className={css.thumbnail} aria-hidden="true" />
      </button>
    </li>
  );
};

type PhotoStripProps = {
  photos: readonly QueuedPhoto[];
  currentId: string | null;
  /** Blocks switching photos, e.g. while "Save all" runs. */
  disabled?: boolean;
  onSelect: (id: string) => void;
};

/**
 * Thumbnail strip of the opened photos. Each thumbnail is a button that makes its photo the
 * current one; the current photo carries `aria-current`.
 * @param props the queued photos, the current photo's id and the selection handler
 */
export const PhotoStrip = ({ photos, currentId, disabled = false, onSelect }: PhotoStripProps) => (
  <ul className={css.strip} aria-label="Opened photos">
    {photos.map((photo, index) => (
      <Thumb
        key={photo.id}
        photo={photo}
        label={`Photo ${index + 1} of ${photos.length}: ${photo.file.name}`}
        current={photo.id === currentId}
        disabled={disabled}
        onSelect={onSelect}
      />
    ))}
  </ul>
);
