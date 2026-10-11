-- One example photo per recipe: the single exception to "photos never leave the device".
--
-- Photos opened in the frame editor still stay on the device. The exception is a photo the
-- signed-in user attaches to a recipe on purpose, to remember what that recipe looks like. The app
-- shrinks it and re-encodes it through a canvas before uploading, so the stored file carries no
-- EXIF (and therefore no GPS). Nothing else may be written to Storage.

-- Object path inside the bucket: `{user_id}/{recipe_id}.jpg`. Null means the recipe has no photo.
-- The path is stored instead of a URL because the bucket is private: a URL would have to be
-- signed and would expire.
alter table public.recipes add column photo_path text;

-- Private bucket: objects are reachable only through the policies below or a signed URL, never by
-- a guessable public link. The limits are a backstop for the client-side resize (long edge 1200px,
-- JPEG): an original straight from the camera, metadata included, is far above 1MB, so Storage
-- itself refuses it even if the app's resize step were bypassed.
-- `on conflict do nothing` keeps this safe when the bucket was already created in the dashboard.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

-- The first path segment is the owner's user id, and it is the only thing the policies trust.
-- The update policy repeats the rule in `with check` so an object cannot be moved or renamed into
-- another user's folder.
-- Four policies rather than one `for all` so each Storage operation can be tightened on its own;
-- replacing a photo (`upsert`) needs insert, select and update together.
create policy recipe_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy recipe_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy recipe_photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy recipe_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- No trigger removes the object when a recipe row is deleted: deleting a storage.objects row in
-- SQL would not delete the file itself. The app removes the photo through the Storage API before
-- it deletes the recipe (entities/recipe/api/recipe-photo.ts).
