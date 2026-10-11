import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteRecipe,
  recipePhotoPath,
  recipePhotoUrl,
  removeRecipePhoto,
  uploadRecipePhoto,
} from './recipe-photo';

// The real client and the canvas are browser/network boundaries. Only those two modules are
// replaced; the order of writes and the cleanup after a failure are what these tests pin down.
const mocks = vi.hoisted(() => ({
  client: null as unknown,
  resizeImage: vi.fn<(file: Blob, options?: { quality?: number }) => Promise<Blob>>(),
}));

vi.mock('@/shared/api/supabase', () => ({
  get supabase() {
    return mocks.client;
  },
}));
vi.mock('@/shared/lib/resize-image', () => ({ resizeImage: mocks.resizeImage }));

const PATH = 'user-1/recipe-1.jpg';
const ORIGINAL = new Blob(['original with exif']);
const RESIZED = new Blob(['resized'], { type: 'image/jpeg' });

type Fake = {
  signedIn?: boolean;
  /** `photo_path` of the recipe row. */
  storedPath?: string | null;
  /** The recipe row does not exist, or belongs to someone else. */
  missing?: boolean;
  updateError?: string;
  uploadError?: string;
};

const useClient = ({
  signedIn = true,
  storedPath = null,
  missing = false,
  updateError,
  uploadError,
}: Fake = {}) => {
  const calls: string[] = [];
  const updated = async (values: unknown) => {
    calls.push(`update ${JSON.stringify(values)}`);
    return { data: { id: 'recipe-1' }, error: updateError ? { message: updateError } : null };
  };

  mocks.client = {
    auth: {
      getSession: async () => ({
        data: { session: signedIn ? { user: { id: 'user-1' } } : null },
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: missing ? null : { photo_path: storedPath },
            error: null,
          }),
        }),
      }),
      update: (values: unknown) => ({
        eq: () => {
          const result = updated(values);
          return Object.assign(result, { select: () => ({ single: () => result }) });
        },
      }),
      delete: () => ({
        eq: async (_column: string, id: string) => {
          calls.push(`delete ${table} ${id}`);
          return { error: null };
        },
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, body: Blob, options: unknown) => {
          calls.push(`upload ${bucket}/${path} ${body.type} ${JSON.stringify(options)}`);
          return { error: uploadError ? { message: uploadError } : null };
        },
        remove: async (paths: string[]) => {
          calls.push(`remove ${bucket}/${paths.join(',')}`);
          return { error: null };
        },
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://signed.example/${path}` },
          error: null,
        }),
      }),
    },
  };
  return calls;
};

const UPLOAD = `upload recipe-photos/${PATH} image/jpeg {"upsert":true,"contentType":"image/jpeg"}`;

beforeEach(() => {
  mocks.resizeImage.mockReset();
  mocks.resizeImage.mockResolvedValue(RESIZED);
});

describe('recipePhotoPath', () => {
  it('when given a user and a recipe, it must put the user id in the first path segment', () => {
    expect(recipePhotoPath('user-1', 'recipe-1')).toBe(PATH);
  });
});

describe('uploadRecipePhoto', () => {
  it('when the recipe has no photo yet, it must upload the resized JPEG and then store the path', async () => {
    const calls = useClient({ storedPath: null });

    await expect(uploadRecipePhoto('recipe-1', ORIGINAL)).resolves.toBe(PATH);
    expect(calls).toEqual([UPLOAD, `update {"photo_path":"${PATH}"}`]);
  });

  it('when a file is picked, it must upload the resized copy and never the original', async () => {
    const upload = vi.fn(async () => ({ error: null }));
    useClient();
    const client = mocks.client as { storage: { from: () => object } };
    client.storage.from = () => ({ upload, remove: async () => ({ error: null }) });

    await uploadRecipePhoto('recipe-1', ORIGINAL);
    expect(mocks.resizeImage).toHaveBeenCalledWith(ORIGINAL);
    expect(upload).toHaveBeenCalledWith(PATH, RESIZED, expect.anything());
  });

  it('when the recipe already has a photo, it must replace the file without writing the row again', async () => {
    const calls = useClient({ storedPath: PATH });

    await expect(uploadRecipePhoto('recipe-1', ORIGINAL)).resolves.toBe(PATH);
    expect(calls).toEqual([UPLOAD]);
  });

  it('when storing the path fails after the upload, it must remove the uploaded file and rethrow', async () => {
    const calls = useClient({ storedPath: null, updateError: 'row update failed' });

    await expect(uploadRecipePhoto('recipe-1', ORIGINAL)).rejects.toThrow('row update failed');
    expect(calls.at(-1)).toBe(`remove recipe-photos/${PATH}`);
  });

  it('when the upload itself fails, it must not touch the recipe row', async () => {
    const calls = useClient({ uploadError: 'too large' });

    await expect(uploadRecipePhoto('recipe-1', ORIGINAL)).rejects.toThrow('too large');
    expect(calls).toEqual([UPLOAD]);
  });

  it('when the recipe does not exist, it must reject before uploading anything', async () => {
    const calls = useClient({ missing: true });

    await expect(uploadRecipePhoto('recipe-1', ORIGINAL)).rejects.toThrow('Save the recipe');
    expect(calls).toEqual([]);
  });

  it('when the resized photo is above the bucket limit, it must retry once at a lower quality', async () => {
    const calls = useClient();
    mocks.resizeImage.mockResolvedValueOnce(new Blob([new Uint8Array(1024 * 1024 + 1)]));

    await expect(uploadRecipePhoto('recipe-1', ORIGINAL)).resolves.toBe(PATH);
    expect(mocks.resizeImage).toHaveBeenLastCalledWith(ORIGINAL, { quality: 0.6 });
    expect(calls[0]).toBe(UPLOAD);
  });

  it('when the photo stays above the bucket limit, it must reject without uploading', async () => {
    const calls = useClient();
    mocks.resizeImage.mockResolvedValue(new Blob([new Uint8Array(1024 * 1024 + 1)]));

    await expect(uploadRecipePhoto('recipe-1', ORIGINAL)).rejects.toThrow('too large');
    expect(calls).toEqual([]);
  });

  it('when signed out, it must reject with a sign-in message and upload nothing', async () => {
    const calls = useClient({ signedIn: false });

    await expect(uploadRecipePhoto('recipe-1', ORIGINAL)).rejects.toThrow('Sign in');
    expect(mocks.resizeImage).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('when Supabase is not configured, it must reject instead of failing silently', async () => {
    mocks.client = null;

    await expect(uploadRecipePhoto('recipe-1', ORIGINAL)).rejects.toThrow('not set up');
  });
});

describe('removeRecipePhoto', () => {
  it('when the recipe has a photo, it must clear the path before removing the file', async () => {
    const calls = useClient({ storedPath: PATH });

    await removeRecipePhoto({ id: 'recipe-1', photoPath: PATH });
    expect(calls).toEqual(['update {"photo_path":null}', `remove recipe-photos/${PATH}`]);
  });

  it('when clearing the path fails, it must keep the file so the recipe still shows its photo', async () => {
    const calls = useClient({ storedPath: PATH, updateError: 'offline' });

    await expect(removeRecipePhoto({ id: 'recipe-1', photoPath: PATH })).rejects.toThrow('offline');
    expect(calls).toEqual(['update {"photo_path":null}']);
  });

  it('when the recipe has no photo, it must make no request', async () => {
    const calls = useClient();

    await removeRecipePhoto({ id: 'recipe-1', photoPath: null });
    expect(calls).toEqual([]);
  });
});

describe('deleteRecipe', () => {
  it('when a recipe is deleted, it must remove its photo file before deleting the row', async () => {
    const calls = useClient({ storedPath: PATH });

    await deleteRecipe('recipe-1');
    expect(calls).toEqual([
      'update {"photo_path":null}',
      `remove recipe-photos/${PATH}`,
      'delete recipes recipe-1',
    ]);
  });

  it('when signed out, it must reject and delete nothing', async () => {
    const calls = useClient({ signedIn: false });

    await expect(deleteRecipe('recipe-1')).rejects.toThrow('Sign in');
    expect(calls).toEqual([]);
  });
});

describe('recipePhotoUrl', () => {
  it('when signed in, it must return a signed URL for the path', async () => {
    useClient();

    await expect(recipePhotoUrl(PATH)).resolves.toBe(`https://signed.example/${PATH}`);
  });

  it('when signed out, it must return null', async () => {
    useClient({ signedIn: false });

    await expect(recipePhotoUrl(PATH)).resolves.toBeNull();
  });

  it('when the recipe has no photo, it must return null', async () => {
    useClient();

    await expect(recipePhotoUrl(null)).resolves.toBeNull();
  });
});
