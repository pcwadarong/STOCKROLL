import { Text } from '@seed-design/react';
import { Link } from 'react-router';

import { labelTitle } from '@/shared/ui/label.css';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageShell } from '@/widgets/page-shell';

import * as css from './LegalPage.css';

type LegalDocument = {
  title: string;
  updated: string;
  sections: readonly { heading: string; body: readonly string[] }[];
  other: { to: string; label: string };
};

const CONTACT =
  'Questions or requests can be sent to the support email shown on the Google sign-in screen for STOCKROLL.';

const PRIVACY: LegalDocument = {
  title: 'Privacy Policy',
  updated: 'October 11, 2026',
  other: { to: '/terms', label: 'Terms of Service' },
  sections: [
    {
      heading: 'Summary',
      body: [
        'STOCKROLL is a personal photo-framing app. Your photos are processed on your device and are never uploaded to or stored on our servers.',
      ],
    },
    {
      heading: 'What we collect',
      body: [
        'If you sign in with Google, we receive your email address and basic profile identifier from Google to create your account.',
        'When signed in, the records you enter — cameras, lenses, films, recipes and shot notes, including any links you add — are stored in our database so you can use them on your other devices.',
        'Without an account nothing is saved: you can still frame photos, and they stay on your device.',
      ],
    },
    {
      heading: 'What we do not collect',
      body: [
        'Photo files, thumbnails and location data (GPS) are not read into our servers. Exported images are re-encoded on your device and carry no original metadata.',
        'We do not use advertising or analytics trackers.',
      ],
    },
    {
      heading: 'How data is stored',
      body: [
        'Account data and records are stored with Supabase. Access rules limit every record to the account that created it. The app is served by Vercel.',
        'We do not sell or share your data with third parties beyond these service providers.',
      ],
    },
    {
      heading: 'Your choices',
      body: [
        'You can use the framing feature without an account. You can sign out at any time, and you can ask for your account and records to be deleted.',
        CONTACT,
      ],
    },
  ],
};

const TERMS: LegalDocument = {
  title: 'Terms of Service',
  updated: 'October 11, 2026',
  other: { to: '/privacy', label: 'Privacy Policy' },
  sections: [
    {
      heading: 'The service',
      body: [
        'STOCKROLL is a personal, non-commercial tool for adding shooting-information frames to photos and keeping notes about gear and film recipes. It is provided free of charge.',
      ],
    },
    {
      heading: 'Your content',
      body: [
        'Your photos and the records you enter remain yours. You are responsible for having the right to use the photos you open in the app.',
      ],
    },
    {
      heading: 'No warranty',
      body: [
        'The service is provided “as is”, without warranty of any kind. It may change, be interrupted or be discontinued at any time. Keep your own copies of anything important.',
        'To the extent permitted by law, the operator is not liable for any loss arising from use of the service.',
      ],
    },
    {
      heading: 'Acceptable use',
      body: ['Do not use the service to break the law or to interfere with its operation.'],
    },
    { heading: 'Contact', body: [CONTACT] },
  ],
};

const LegalPage = ({ document }: { document: LegalDocument }) => (
  <PageShell>
    <article className={css.article}>
      <PageHeader title={document.title} lead={`Last updated ${document.updated}`} />
      {document.sections.map(({ heading, body }) => (
        <section key={heading} className={css.section}>
          <h2 className={labelTitle}>{heading}</h2>
          {body.map(paragraph => (
            <Text key={paragraph} as="p" textStyle="t4Regular" color="fg.neutralMuted">
              {paragraph}
            </Text>
          ))}
        </section>
      ))}
      <Link to={document.other.to} className={css.link}>
        {document.other.label}
      </Link>
    </article>
  </PageShell>
);

/** Public privacy policy, linked from the Google sign-in consent screen. */
export const PrivacyPage = () => <LegalPage document={PRIVACY} />;

/** Public terms of service, linked from the Google sign-in consent screen. */
export const TermsPage = () => <LegalPage document={TERMS} />;
