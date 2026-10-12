import { describe, expect, it } from 'vitest';

import {
  assignSlot,
  clearSlot,
  filledSlots,
  isSimulationSlot,
  KIT_SLOTS,
  liveSlots,
  nextEmptySlot,
  slotOfRecipe,
} from './kit';

describe('assignSlot', () => {
  it('when a recipe is put into an empty slot, it must leave the other slots as they were', () => {
    expect(assignSlot({ C1: 'a' }, 'C2', 'b')).toEqual({ C1: 'a', C2: 'b' });
  });

  it('when a recipe already sits in another slot, it must move rather than appear twice', () => {
    expect(assignSlot({ C1: 'a', C2: 'b' }, 'C5', 'a')).toEqual({ C2: 'b', C5: 'a' });
  });

  it('when the slot is taken, it must replace what was there', () => {
    expect(assignSlot({ C1: 'a' }, 'C1', 'b')).toEqual({ C1: 'b' });
  });

  it('when called, it must not change the slots it was given', () => {
    const slots = { C1: 'a' };
    assignSlot(slots, 'C2', 'a');
    expect(slots).toEqual({ C1: 'a' });
  });
});

describe('assignSlot (film simulation dial)', () => {
  it('when a simulation is put on a second dial position, it must stay on the first too', () => {
    expect(assignSlot({ FS1: 'Classic Chrome' }, 'FS2', 'Classic Chrome')).toEqual({
      FS1: 'Classic Chrome',
      FS2: 'Classic Chrome',
    });
  });

  it('when a dial position is filled, it must not disturb the custom settings', () => {
    expect(assignSlot({ C1: 'a' }, 'FS1', 'ACROS')).toEqual({ C1: 'a', FS1: 'ACROS' });
  });
});

describe('isSimulationSlot', () => {
  it('when given a slot, it must tell dial positions from custom settings', () => {
    expect(isSimulationSlot('FS3')).toBe(true);
    expect(isSimulationSlot('C7')).toBe(false);
  });
});

describe('clearSlot', () => {
  it('when a slot is cleared, it must be absent rather than hold an empty value', () => {
    expect(clearSlot({ C1: 'a', FS1: 'ACROS' }, 'C1')).toEqual({ FS1: 'ACROS' });
  });
});

describe('nextEmptySlot', () => {
  it('when later slots are free, it must offer the first free one after the given slot', () => {
    expect(nextEmptySlot({ C1: 'a', C2: 'b' }, 'C1')).toBe('C3');
  });

  it('when only an earlier slot is free, it must wrap around to it', () => {
    const full = Object.fromEntries(KIT_SLOTS.map(slot => [slot, slot]));
    expect(nextEmptySlot(clearSlot(full, 'C2'), 'FS3')).toBe('C2');
  });

  it('when every slot is taken, it must stay on the given slot', () => {
    const full = Object.fromEntries(KIT_SLOTS.map(slot => [slot, slot]));
    expect(nextEmptySlot(full, 'C4')).toBe('C4');
  });
});

describe('liveSlots', () => {
  it('when a slot points at a recipe that was deleted, it must read as empty', () => {
    expect(liveSlots({ C1: 'a', C2: 'gone' }, new Set(['a']))).toEqual({ C1: 'a' });
  });

  it('when stored slots hold unknown keys or non-text values, it must drop them', () => {
    expect(liveSlots({ C9: 'a', C1: 3, C2: 'a' }, new Set(['a']))).toEqual({ C2: 'a' });
  });

  it('when a dial position holds a listed film simulation, it must keep it', () => {
    expect(liveSlots({ FS1: 'Classic Neg.' }, new Set())).toEqual({ FS1: 'Classic Neg.' });
  });

  it('when a dial position holds a recipe id or an unknown name, it must read as empty', () => {
    expect(liveSlots({ FS1: 'a', FS2: 'Kodachrome' }, new Set(['a']))).toEqual({});
  });

  it('when nothing was stored, it must return no slots', () => {
    expect(liveSlots(null, new Set(['a']))).toEqual({});
  });
});

describe('slotOfRecipe and filledSlots', () => {
  it('when a recipe is in the kit, it must report its slot and count it', () => {
    const slots = { C3: 'a', C5: 'b', FS1: 'ACROS' } as const;
    expect(slotOfRecipe(slots, 'b')).toBe('C5');
    expect(slotOfRecipe(slots, 'z')).toBeUndefined();
    expect(filledSlots(slots)).toBe(3);
  });
});
