import IconArrowDownLine from '@karrotmarket/react-monochrome-icon/IconArrowDownLine';
import IconArrowUpLine from '@karrotmarket/react-monochrome-icon/IconArrowUpLine';
import { Icon } from '@seed-design/react';
import { useEffect, useRef, useState } from 'react';

import { MAX_CARD_PHOTOS } from '@/entities/recipe';
import { Button } from '@/shared/ui/Button';
import { ErrorText } from '@/shared/ui/ErrorText';

import type { CardPhotoItem } from '../model/use-recipe-card';

import * as css from './CardPhotoList.css';

// Drawn small: the list only has to tell the photos apart.
const THUMBNAIL_EDGE = 160;

const Thumbnail = ({ bitmap }: { bitmap: ImageBitmap }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = THUMBNAIL_EDGE / Math.max(bitmap.width, bitmap.height);
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }, [bitmap]);
  // Decorative: the buttons beside it name the photo by its place in the order.
  return <canvas ref={canvasRef} className={css.thumbnail} aria-hidden="true" />;
};

type CardPhotoListProps = {
  photos: readonly CardPhotoItem[];
  /** Adds picked files; resolves to how many of them could not be used. */
  onAdd: (files: readonly File[]) => Promise<number>;
  onRemove: (id: string) => void;
  onMove: (id: string, by: -1 | 1) => void;
};

/**
 * The photos on a recipe card, in the order they are shown: each can be moved up or down the
 * list or taken off, and more can be added from this device up to the card's limit.
 * @param props the photos and the handlers that add, remove and reorder them
 */
export const CardPhotoList = ({ photos, onAdd, onRemove, onMove }: CardPhotoListProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const full = photos.length >= MAX_CARD_PHOTOS;

  const add = (files: readonly File[]) => {
    setError('');
    const room = MAX_CARD_PHOTOS - photos.length;
    void onAdd(files).then(unused => {
      if (unused === 0) return;
      setError(
        files.length > room
          ? `A card holds ${MAX_CARD_PHOTOS} photos. ${unused} ${unused === 1 ? 'was' : 'were'} not added.`
          : `${unused} ${unused === 1 ? 'file' : 'files'} could not be read. Try a JPEG or PNG.`,
      );
    });
  };

  return (
    <div className={css.root}>
      {photos.length > 0 && (
        <ol className={css.list} aria-label="Photos on the card">
          {photos.map((photo, index) => {
            const name = `photo ${index + 1}`;
            return (
              <li key={photo.id} className={css.item}>
                <Thumbnail bitmap={photo.bitmap} />
                <span className={css.caption}>
                  {index + 1}
                  {photo.example && ' · Example photo'}
                </span>
                <span className={css.actions}>
                  <Button
                    variant="plain"
                    aria-label={`Move ${name} up`}
                    disabled={index === 0}
                    onClick={() => onMove(photo.id, -1)}
                  >
                    <Icon svg={<IconArrowUpLine />} />
                  </Button>
                  <Button
                    variant="plain"
                    aria-label={`Move ${name} down`}
                    disabled={index === photos.length - 1}
                    onClick={() => onMove(photo.id, 1)}
                  >
                    <Icon svg={<IconArrowDownLine />} />
                  </Button>
                  <Button
                    variant="plain"
                    // Holds the visible "Remove", and says it only leaves the card: the example
                    // photo stays on the recipe.
                    aria-label={`Remove ${name} from the card`}
                    onClick={() => onRemove(photo.id)}
                  >
                    Remove
                  </Button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <input
        ref={inputRef}
        className={css.hiddenInput}
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        onChange={event => {
          add(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <Button size="small" disabled={full} onClick={() => inputRef.current?.click()}>
        Add photos
      </Button>
      {/* Required on screen (AGENTS §3-31): added photos are held in memory only. */}
      <p className={css.note}>
        {photos.length} of {MAX_CARD_PHOTOS} · Added photos stay on this device until you leave.
      </p>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
};
