import { Text } from '@seed-design/react';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { MarkFields } from '@/entities/mark';
import {
  CARD_ALIGNS,
  CARD_BACKGROUND_SWATCHES,
  CARD_DESIGNS,
  CARD_DETAILS,
  CARD_DIM,
  CARD_GAPS,
  CARD_INK_SWATCHES,
  CARD_PADDINGS,
  CARD_TEXT_PLACES,
  CARD_TEXT_SIZE,
  DEFAULT_CARD_STYLE,
  systemOf,
  SYSTEMS,
  versionsOf,
} from '@/entities/recipe';
import { SignInGate } from '@/features/auth';
import { Button } from '@/shared/ui/Button';
import { Control, SwatchRow } from '@/shared/ui/Control';
import { controls } from '@/shared/ui/Control.css';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { Chips, Segments } from '@/shared/ui/Options';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Panel } from '@/shared/ui/Panel';
import * as bench from '@/shared/ui/workbench.css';
import { AppBar } from '@/widgets/app-bar';
import { PageShell } from '@/widgets/page-shell';
import { Slider } from 'seed-design/ui/slider';

import { CARD_OUTPUTS, cardOutputOf } from '../model/share-recipe';
import { useCardStyle } from '../model/use-card-style';
import { useRecipeCard } from '../model/use-recipe-card';
import { useRecipeLibrary } from '../model/use-recipe-library';

import { CardOwnPlaceControl } from './CardOwnPlaceControl';
import { CardPhotoList } from './CardPhotoList';

import * as css from './LibraryPage.css';

// Shown in a color well while the color is automatic; the well cannot be empty.
const AUTO_COLOR_WELL = '#ffffff';

const TEXT_ORDERS = [
  { value: 'after', label: 'After photos' },
  { value: 'before', label: 'Before photos' },
] as const;

/**
 * A recipe as an image, before it is saved: the card on the left as it will be saved, and on the
 * right its photos, design, size, spacing, colors and the user's own text. Laid out like the
 * frame editor, so a change is seen on the card as it is made.
 */
export const RecipeCardPage = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { recipes, versions, ready } = useRecipeLibrary();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const recipe = recipes.find(item => item.id === id);
  const history = recipe ? versionsOf(versions, recipe.id) : [];
  // The version in the URL when it exists, otherwise the newest.
  const selected = history.find(item => String(item.version) === params.get('v')) ?? history[0];
  const versionLabel = selected ? `v${selected.version}` : '';
  const { style, update } = useCardStyle();
  const { canvasRef, loading, exampleFailed, photos, addPhotos, removePhoto, movePhoto, save } =
    useRecipeCard(recipe, selected?.settings, style);
  const output = cardOutputOf(style.ratio);

  if (!ready || !recipe || !selected)
    return (
      <PageShell>
        <PageHeader title="Recipe card" />
        <SignInGate what="recipes">
          <Panel>
            <EmptyState title={ready ? 'Nothing to show' : 'Loading'}>
              {!ready
                ? 'One moment.'
                : recipe
                  ? 'This recipe has no settings yet, so there is no card to make.'
                  : 'This recipe no longer exists.'}
            </EmptyState>
          </Panel>
        </SignInGate>
      </PageShell>
    );

  const back = `/recipes/${recipe.id}?v=${selected.version}`;
  const covered = style.design === 'cover';
  const onSave = () => {
    setError('');
    setNotice('');
    setSaving(true);
    save()
      .then(
        // A download is only handed over: the browser does not say whether it was kept.
        outcome => setNotice(outcome === 'downloaded' ? "Sent to your browser's downloads." : ''),
        () => setError('Could not make the image. Try again.'),
      )
      .finally(() => setSaving(false));
  };

  return (
    <div className={bench.page}>
      <AppBar />
      <main className={bench.root}>
        <section aria-label="Preview" className={bench.stage}>
          {/* Sized 0x0 until the card is drawn, so no empty box shows while the photo loads. */}
          <canvas
            ref={canvasRef}
            className={bench.preview}
            width={0}
            height={0}
            role="img"
            aria-label={`Preview of the recipe card: ${recipe.name}`}
            aria-busy={loading}
          />
          <p className={bench.status} role="status" aria-live="polite">
            {loading ? 'Loading the card' : notice}
          </p>
        </section>

        <aside className={bench.panel} aria-label="Card settings">
          <div className={bench.group}>
            <h1 className={bench.legend}>Recipe card</h1>
            <p className={css.note}>
              {recipe.name} · {SYSTEMS[systemOf(recipe)].label} · {versionLabel}
            </p>
          </div>

          <fieldset className={bench.group}>
            <legend className={bench.legend}>Photos</legend>
            {exampleFailed && (
              <ErrorText>
                The example photo could not be loaded. Reload the page to try again.
              </ErrorText>
            )}
            <CardPhotoList
              photos={photos}
              onAdd={addPhotos}
              onRemove={removePhoto}
              onMove={movePhoto}
            />
          </fieldset>

          <fieldset className={bench.group}>
            <legend className={bench.legend}>Design</legend>
            <div className={controls}>
              <Control
                label="Text and photos"
                hint={
                  covered
                    ? 'The photos fill the card, cut to fit, and the text sits over them.'
                    : 'One photo is shown whole. Several are cut to fill a grid; with three, the text takes the fourth cell.'
                }
              >
                <Segments
                  label="Where the text goes"
                  value={style.design}
                  options={CARD_DESIGNS}
                  onChange={design => update({ design })}
                />
              </Control>

              {covered ? (
                <>
                  <Control label="Text place">
                    <Chips
                      label="Where the text sits over the photos"
                      value={style.textPlace}
                      options={CARD_TEXT_PLACES}
                      onChange={textPlace => update({ textPlace })}
                    />
                  </Control>
                  <Control
                    label="Text size"
                    hint="100% is the largest that still fits on the card."
                  >
                    <Slider
                      {...CARD_TEXT_SIZE}
                      values={[style.textSize]}
                      onValuesChange={([textSize]) =>
                        textSize !== undefined && update({ textSize })
                      }
                      getAriaLabel={() => 'Text size'}
                      getAriaValuetext={value => `${value}%`}
                      getValueIndicatorLabel={({ value }) => `${value}%`}
                    />
                  </Control>
                  {photos.length > 0 && (
                    <Control label="Darken photos">
                      <Slider
                        {...CARD_DIM}
                        values={[style.dim]}
                        onValuesChange={([dim]) => dim !== undefined && update({ dim })}
                        getAriaLabel={() => 'How much the photos are darkened'}
                        getAriaValuetext={value => `${value}%`}
                        getValueIndicatorLabel={({ value }) => `${value}%`}
                      />
                    </Control>
                  )}
                </>
              ) : (
                photos.length > 0 && (
                  <Control label="Text order">
                    <Segments
                      label="Whether the text comes before or after the photos"
                      value={style.textFirst ? 'before' : 'after'}
                      options={TEXT_ORDERS}
                      onChange={order => update({ textFirst: order === 'before' })}
                    />
                  </Control>
                )
              )}

              <Control label="Align">
                <Segments
                  label="Text alignment"
                  value={style.align}
                  options={CARD_ALIGNS}
                  onChange={align => update({ align })}
                />
              </Control>
              <Control label="Padding">
                <Segments
                  label="Padding around the card"
                  value={style.padding}
                  options={CARD_PADDINGS}
                  onChange={padding => update({ padding })}
                />
              </Control>
              {photos.length > 1 && (
                <Control label="Gap between photos">
                  <Segments
                    label="Gap between photos"
                    value={style.gap}
                    options={CARD_GAPS}
                    onChange={gap => update({ gap })}
                  />
                </Control>
              )}
            </div>
          </fieldset>

          <fieldset className={bench.group}>
            <legend className={bench.legend}>Output</legend>
            <Chips
              label="Output ratio"
              value={output.id}
              options={CARD_OUTPUTS.map(item => ({ value: item.id, label: item.label }))}
              onChange={ratio => update({ ratio })}
            />
            <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle" aria-live="polite">
              {output.hint}
              {output.size && ` · ${output.size.width}×${output.size.height}`}
            </Text>
          </fieldset>

          <fieldset className={bench.group}>
            <legend className={bench.legend}>File</legend>
            <Segments
              label="File size"
              value={style.detail}
              options={CARD_DETAILS}
              onChange={detail => update({ detail })}
            />
            <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
              {style.detail === 'full'
                ? 'Keeps the photos as sharp as they were opened, up to the largest image a browser can draw. Larger file. The preview does not change.'
                : 'Sized for posting. Smaller file, quick to upload.'}
            </Text>
          </fieldset>

          <fieldset className={bench.group}>
            <legend className={bench.legend}>Colors</legend>
            <div className={controls}>
              <Control label="Background">
                <SwatchRow
                  label="Background color"
                  value={style.background}
                  fallback={DEFAULT_CARD_STYLE.background}
                  swatches={CARD_BACKGROUND_SWATCHES}
                  onChange={background => update({ background })}
                />
              </Control>
              <Control label="Name">
                <SwatchRow
                  label="Color of the recipe name"
                  value={style.titleColor}
                  fallback={AUTO_COLOR_WELL}
                  swatches={CARD_INK_SWATCHES}
                  onChange={titleColor => update({ titleColor })}
                />
              </Control>
              <Control
                label="Settings"
                hint="Auto picks dark or light to suit what is behind the text."
              >
                <SwatchRow
                  label="Color of the settings"
                  value={style.textColor}
                  fallback={AUTO_COLOR_WELL}
                  swatches={CARD_INK_SWATCHES}
                  onChange={textColor => update({ textColor })}
                />
              </Control>
            </div>
          </fieldset>

          {/* The same text the frame editor uses, so changing it here changes it there too.
              Where it goes is the card's own choice: a card offers only a few places. */}
          <fieldset className={bench.group}>
            <legend className={bench.legend}>Your text</legend>
            <MarkFields
              dated={false}
              place={
                <CardOwnPlaceControl
                  value={style.ownPlace}
                  onChange={ownPlace => update({ ownPlace })}
                />
              }
            />
          </fieldset>

          {error && <ErrorText>{error}</ErrorText>}
          <div className={bench.actions}>
            <Button className={bench.action} to={back}>
              Back to recipe
            </Button>
            <Button
              className={bench.action}
              variant="primary"
              disabled={loading}
              loading={saving}
              onClick={onSave}
            >
              Save image
            </Button>
          </div>
        </aside>
      </main>
    </div>
  );
};
