import { describe, expect, it } from 'vitest';

import {
  appendPhotos,
  applyGearPicksToAll,
  currentPhoto,
  emptyQueue,
  MAX_PHOTOS,
  type PhotoQueue,
  type QueueItem,
  removePhoto,
  roomLeft,
  selectPhoto,
  setPhotoPick,
} from './photo-queue';
import { FROM_EXIF } from './resolve-caption';

const photo = (id: string, picks: QueueItem['picks'] = {}): QueueItem => ({ id, picks });

const queueOf = (ids: readonly string[], currentId: string | null): PhotoQueue<QueueItem> => ({
  items: ids.map(id => photo(id)),
  currentId,
});

const ids = (queue: PhotoQueue<QueueItem>) => queue.items.map(item => item.id);

describe('currentPhoto', () => {
  it('when the queue is empty, it must return null', () => {
    expect(currentPhoto(emptyQueue())).toBeNull();
  });

  it('when a photo is current, it must return that photo', () => {
    expect(currentPhoto(queueOf(['a', 'b'], 'b'))?.id).toBe('b');
  });
});

describe('appendPhotos', () => {
  it('when photos are opened into an empty queue, it must show the first of them', () => {
    const queue = appendPhotos(emptyQueue<QueueItem>(), [photo('a'), photo('b')]);
    expect(ids(queue)).toEqual(['a', 'b']);
    expect(queue.currentId).toBe('a');
  });

  it('when more photos are opened later, it must keep the earlier ones and append in order', () => {
    const queue = appendPhotos(queueOf(['a', 'b'], 'b'), [photo('c'), photo('d')]);
    expect(ids(queue)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('when more photos are opened later, it must show the first newly opened photo', () => {
    expect(appendPhotos(queueOf(['a', 'b'], 'a'), [photo('c'), photo('d')]).currentId).toBe('c');
  });

  it('when a later photo of a batch arrives, it must join the end without taking the preview', () => {
    const queue = appendPhotos(queueOf(['a', 'b'], 'a'), [photo('c')], false);
    expect(ids(queue)).toEqual(['a', 'b', 'c']);
    expect(queue.currentId).toBe('a');
  });

  it('when a later photo arrives after every photo was removed, it must be shown', () => {
    expect(appendPhotos(emptyQueue<QueueItem>(), [photo('c')], false).currentId).toBe('c');
  });

  it('when nothing could be opened, it must leave the queue and the current photo unchanged', () => {
    const queue = queueOf(['a', 'b'], 'b');
    expect(appendPhotos(queue, [])).toBe(queue);
  });
});

describe('selectPhoto', () => {
  it('when a queued photo is selected, it must become the current photo', () => {
    expect(selectPhoto(queueOf(['a', 'b'], 'a'), 'b').currentId).toBe('b');
  });

  it('when the id is not in the queue, it must keep the current photo', () => {
    const queue = queueOf(['a', 'b'], 'a');
    expect(selectPhoto(queue, 'gone')).toBe(queue);
  });
});

describe('removePhoto', () => {
  it('when another photo is removed, it must keep the current photo', () => {
    const queue = removePhoto(queueOf(['a', 'b', 'c'], 'c'), 'a');
    expect(ids(queue)).toEqual(['b', 'c']);
    expect(queue.currentId).toBe('c');
  });

  it('when the current photo is removed, it must show the photo that takes its place', () => {
    expect(removePhoto(queueOf(['a', 'b', 'c'], 'b'), 'b').currentId).toBe('c');
  });

  it('when the current photo is the last one, it must fall back to the photo before it', () => {
    expect(removePhoto(queueOf(['a', 'b', 'c'], 'c'), 'c').currentId).toBe('b');
  });

  it('when the only photo is removed, it must leave no current photo', () => {
    const queue = removePhoto(queueOf(['a'], 'a'), 'a');
    expect(queue.items).toEqual([]);
    expect(queue.currentId).toBeNull();
  });

  it('when the id is not in the queue, it must change nothing', () => {
    const queue = queueOf(['a'], 'a');
    expect(removePhoto(queue, 'gone')).toBe(queue);
  });
});

describe('setPhotoPick', () => {
  it('when one photo gets a pick, it must not change the picks of the other photos', () => {
    const queue = setPhotoPick(queueOf(['a', 'b'], 'a'), 'a', 'camera', 'c1');
    expect(queue.items.map(item => item.picks)).toEqual([{ camera: 'c1' }, {}]);
  });

  it('when a pick is set to undefined, it must return that slot to auto and keep the rest', () => {
    const queue: PhotoQueue<QueueItem> = {
      items: [photo('a', { iso: '800', shutter: '1/60' })],
      currentId: 'a',
    };
    expect(setPhotoPick(queue, 'a', 'iso', undefined).items[0]?.picks).toEqual({
      iso: undefined,
      shutter: '1/60',
    });
  });
});

describe('applyGearPicksToAll', () => {
  const picksAfter = (source: QueueItem['picks'], other: QueueItem['picks']) =>
    applyGearPicksToAll({ items: [photo('a', source), photo('b', other)], currentId: 'a' }, 'a')
      .items[1]?.picks ?? {};

  it('when applied, it must copy camera, lens, film and look to every other photo', () => {
    const source = { camera: 'c1', lens: 'l1', film: 'f1', look: 'recipe:r1' };
    expect(picksAfter(source, {})).toEqual(source);
  });

  it('when applied, it must not copy exposure values', () => {
    const source = { camera: 'c1', iso: '400', focal: '35', aperture: '2', shutter: '1/125' };
    expect(picksAfter(source, { iso: '1600' })).toMatchObject({ camera: 'c1', iso: '1600' });
    expect(picksAfter(source, {})).not.toHaveProperty('shutter');
  });

  it('when the source slot is still auto, it must return that slot to auto on the others', () => {
    expect(picksAfter({ lens: 'l1' }, { camera: 'c9', lens: 'l9' })).toEqual({
      camera: undefined,
      lens: 'l1',
      film: undefined,
      look: undefined,
    });
  });

  it('when the source explicitly shows nothing, it must copy the empty choice', () => {
    expect(picksAfter({ lens: '' }, { lens: 'l9' }).lens).toBe('');
  });

  it('when the source uses its own EXIF value, it must leave the others on auto instead', () => {
    expect(picksAfter({ camera: FROM_EXIF }, { camera: 'c9' }).camera).toBeUndefined();
  });

  it('when applied, it must leave the source photo as it is', () => {
    const queue: PhotoQueue<QueueItem> = {
      items: [photo('a', { camera: FROM_EXIF, iso: '400' }), photo('b')],
      currentId: 'a',
    };
    expect(applyGearPicksToAll(queue, 'a').items[0]).toBe(queue.items[0]);
  });

  it('when the source photo is not in the queue, it must change nothing', () => {
    const queue = queueOf(['a', 'b'], 'a');
    expect(applyGearPicksToAll(queue, 'gone')).toBe(queue);
  });
});

describe('roomLeft', () => {
  const queueOf = (count: number) => ({
    items: Array.from({ length: count }, (_, index) => ({ id: `p${index}`, picks: {} })),
    currentId: null,
  });

  it('when the queue is below the limit, it must report how many more photos fit', () => {
    expect(roomLeft(queueOf(0))).toBe(MAX_PHOTOS);
    expect(roomLeft(queueOf(MAX_PHOTOS - 3))).toBe(3);
  });

  it('when the queue is at the limit, it must report no room and never a negative number', () => {
    expect(roomLeft(queueOf(MAX_PHOTOS))).toBe(0);
    expect(roomLeft(queueOf(MAX_PHOTOS + 2))).toBe(0);
  });
});
