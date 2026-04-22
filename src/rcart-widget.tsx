import React from 'react';
import {
  SectionHero,
  SectionGames,
  SectionTopBanner,
  SectionSteps,
  SectionPartneredGames,
  SectionTestimonials,
  SectionFaq,
  SupportButtons,
  ProgressRewards,
  ProgressAmount,
} from 'getjacked-components';
import { useRcartGameApi } from './use-rcart-game-api';

export type RcartWidgetProps = {
  partnerCode: string;
  email: string | null;
  storeName?: string;
};

export function RcartWidget({ partnerCode, email, storeName = 'My Store' }: RcartWidgetProps) {
  const [resolvedEmail, setResolvedEmail] = React.useState<string | null>(email);

  const { games, activities, partnerSettings, rewardAmount, loading, error, refetch } = useRcartGameApi({
    partnerCode,
    email: resolvedEmail,
  });

  const milestones = partnerSettings.milestones ?? [];
  const goalAmount = typeof partnerSettings.rewardGoal?.thresholdAmount === 'number'
    ? partnerSettings.rewardGoal.thresholdAmount
    : rewardAmount;
  const showProgress = !!resolvedEmail && milestones.length > 0;

  return (
    <div>
      <SectionTopBanner
        storeName={storeName}
        partnerName={storeName}
        partnerCode={partnerCode}
        ctaText="Start earning rewards"
        showProgressState={showProgress}
        progressContent={
          showProgress ? (
            <ProgressRewards
              milestones={milestones}
              rewardAmount={rewardAmount}
              partnerName={storeName}
              goalAmount={goalAmount}
            />
          ) : undefined
        }
        progressAmount={
          showProgress ? (
            <ProgressAmount
              amount={String(rewardAmount)}
              thresholdAmount={goalAmount}
            />
          ) : undefined
        }
        onCtaClick={() => {
          const el = document.getElementById('rcart-widget-games');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      <SectionHero
        storeName={storeName}
        bundleAmount={partnerSettings.rewardGoal?.thresholdAmount ?? rewardAmount}
        discountAmount={partnerSettings.rewardGoal?.discount}
        to="#rcart-widget-games"
        heroImageSrc="https://cdn.shopify.com/s/files/1/0000/0000/0000/files/goli-new-hero.png"
      />

      <SectionSteps
        partnerName={storeName}
        partnerCode={partnerCode}
        images={[
          'https://test.withrcart.com/goli/step-1-bg.webp',
          'https://test.withrcart.com/goli/step-2-bg.webp',
          'https://test.withrcart.com/goli/step-3-bg.webp',
        ]}
        ctaText="Start Playing"
        to="#rcart-widget-games"
        style={{ marginTop: '1.5rem' }}
      />

      <SectionPartneredGames
        partnerCode={partnerCode}
        partnerName={storeName}
        to="#rcart-widget-games"
        bundleAmount={partnerSettings.rewardGoal?.thresholdAmount ?? rewardAmount}
        rewardAmount={rewardAmount}
        isLoggedIn={!!resolvedEmail}
        onLogin={(submittedEmail) => setResolvedEmail(submittedEmail)}
        activities={resolvedEmail ? activities : []}
        partnerSettings={partnerSettings}
        refetchOffers={refetch}
        style={{ marginTop: '1.5rem' }}
      />

      <div id="rcart-widget-games" style={{ marginTop: '1.5rem' }}>
        <SectionGames
          games={resolvedEmail ? games : []}
          activities={resolvedEmail ? activities : []}
          loading={loading}
          error={error}
          partnerCode={partnerCode}
          partnerName={storeName}
          isLoggedIn={!!resolvedEmail}
          onLogin={(submittedEmail) => setResolvedEmail(submittedEmail)}
          bundleAmount={partnerSettings.rewardGoal?.thresholdAmount ?? rewardAmount}
          partnerSettings={partnerSettings}
          rewardAmount={rewardAmount}
          refetchOffers={refetch}
        />
      </div>

      <SectionTestimonials
        partnerCode={partnerCode}
        style={{ marginTop: '1.5rem' }}
      />

      <SectionFaq
        partnerCode={partnerCode}
        partnerName={storeName}
        style={{ marginTop: '1.5rem' }}
      />

      <div style={{ marginTop: '1.5rem' }}>
        <SupportButtons
          items={[
            { label: 'Need help?', onClick: () => window.open('mailto:support@yourstore.com', '_blank') },
          ]}
        />
      </div>
    </div>
  );
}
