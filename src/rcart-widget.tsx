import React, { useEffect, useState } from 'react';
import {
  SectionHero,
  SectionGames,
  SectionGameHero,
  SectionSteps,
  SectionPartneredGames,
  SectionTestimonials,
  SectionFaq,
} from 'getjacked-components';
import { StorefrontHeader } from './components/storefront-header';
import { useRcartGameApi } from './use-rcart-game-api';

export type RcartWidgetProps = {
  partnerCode: string;
  email: string | null;
  storeName?: string;
};

function isGamesHash(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hash === '#games';
}

export function RcartWidget({ partnerCode = 'goli', email, storeName = 'My Store' }: RcartWidgetProps) {
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(email);
  const [showPage, setShowPage] = useState<'landing' | 'games'>(() =>
    isGamesHash() ? 'games' : 'landing',
  );
  const [discountCode, setDiscountCode] = useState<string | null>(null);

  const { games, activities, partnerSettings, rewardAmount, loading, error,sessionUser, refetch } = useRcartGameApi({
    partnerCode,
    email: resolvedEmail,
  });

  const brandLabel = storeName?.trim() ? storeName : '';
  const heroGame = games?.[0];
  const gameList = games?.slice(1);

  const isLoggedIn = sessionUser?.email;

  useEffect(() => {
    const onHashChange = () => {
      setShowPage(isGamesHash() ? 'games' : 'landing');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const gotoGamesPage = () => {
    //TODO: Add shopify logic to redirect to the games page
    setShowPage('games');
    if (typeof window !== 'undefined' && window.location.hash !== '#games') {
      const { pathname, search } = window.location;
      window.history.replaceState(null, '', `${pathname}${search}#games`);
    }
  };
  const gotoLandingPage = () => {
    //TODO: Add shopify logic to redirect to the landing page
    setShowPage('landing');
    if (typeof window !== 'undefined' && window.location.hash === '#games') {
      const { pathname, search } = window.location;
      window.history.replaceState(null, '', `${pathname}${search}`);
    }
  };
  const handleLogin = (submittedEmail: string) => {
    // TODO: Add shopify login logic to login the user and then set the resolvedEmail
    setResolvedEmail(submittedEmail);
    gotoGamesPage?.();
  };

  const handleGenerateDiscountCode = () => {
    //TODO: Add shopify tracking here and internal logic.
    //TODO: Pass the discount code value generated to set discount code (setDiscountCode)
    setDiscountCode("GOLI123"); 
    console.log("Generate discount code");
  }
  const handleFirstMilestoneClaim = () => {
    //TODO: Add shopify tracking here and internal logic.
    console.log("First milestone claimed");
  }
  const handleLastMilestoneClaim = () => {
    //TODO: Add shopify tracking here and internal logic.
    console.log("Last milestone claimed");
  }


  return (
    <div>
      <StorefrontHeader
        partnerCode={partnerCode}
        partnerName={storeName}
        brandLabel={brandLabel}
        isLoggedIn={!!isLoggedIn}
        isLandingPage={showPage === 'landing'}
        onRewardsClick={gotoLandingPage}
        onCtaClick={gotoGamesPage}
        onCartClick={() => {
          console.log('cart clicked');
        }}
        rewardAmount={rewardAmount || 0}
        partnerSettings={partnerSettings}
        discountCode={discountCode || ""}
        onGenerateDiscountCode={handleGenerateDiscountCode}
        onClaimFirstMilestone={handleFirstMilestoneClaim}
        onClaimLastMilestone={handleLastMilestoneClaim}
      />

      {showPage === 'landing' ? (
        <>
          <SectionHero
            storeName={storeName}
            bundleAmount={partnerSettings.rewardGoal?.thresholdAmount ?? rewardAmount}
            discountAmount={partnerSettings.rewardGoal?.discount}
            onCTAClick={gotoGamesPage}
            to="#games"
          />
          <div id="rcart-widget-games" style={{ scrollMarginTop: '1rem' }}>
            <SectionPartneredGames
              partnerCode={partnerCode}
              partnerName={storeName}
              maxIncompleteOffers={partnerSettings.maxIncompleteOffers}       
              bundleAmount={Number(partnerSettings.rewardGoal?.thresholdAmount ?? rewardAmount)}
              rewardAmount={rewardAmount}
              isLoggedIn={!!resolvedEmail}
              activities={resolvedEmail ? activities : []}
              partnerSettings={partnerSettings}
              refetchOffers={refetch}    
              onLogin={handleLogin}
              onBrowse={gotoGamesPage}
              to="#games"
            />
          </div>
          <SectionSteps
            partnerName={storeName}
            partnerCode={partnerCode}
            images={[
              'https://test.withrcart.com/goli/step-1-bg.webp',
              'https://test.withrcart.com/goli/step-2-bg.webp',
              'https://test.withrcart.com/goli/step-3-bg.webp',
            ]}
            ctaText="Start Playing"
            onCTAClick={gotoGamesPage}
            to=""
          />

          <SectionTestimonials
            partnerCode={partnerCode}
          />

          <SectionFaq
            partnerCode={partnerCode}
            partnerName={storeName}
          />
        </>
      ) : showPage === 'games' ? (
        <>
          <SectionGameHero
            partnerCode={partnerCode}
            partnerName={storeName}
            game={heroGame}
            onCtaClick={() => {
              // User clicked the game hero CTA
              //TODO: Add shopify tracking here and internal logic.
              console.log("Game Hero CTA Clicked!");
            }}
            bundleAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 0}
            rewardAmount={Number(rewardAmount) || 0}
            onLogin={handleLogin}
            onStartGame={(selectedGame) => {
              // User chose to start the featured offer from the hero (e.g. install / play flow). `selectedGame` is the offer payload from the library.
              // TODO: analytics — game_start (source: hero)
              console.log("Start Game Clicked!", selectedGame);
            }}
            onSelectedGame={(selectedGame) => {
              // User focused or selected the featured game without necessarily starting it (library-specific interaction).
              // TODO: analytics — game_selected (source: hero)
              console.log("Selected Game!", selectedGame);
            }}
            onGameCTAClick={(selectedGame) => {
              // Secondary CTA on the game card in the hero (e.g. “details” / alternate action), not the same as onCtaClick in all themes.
              // TODO: analytics — game_cta_click (source: hero)
              console.log("Game CTA Clicked!", selectedGame);
            }}
            activities={activities}
            maxIncompleteOffers={partnerSettings?.maxIncompleteOffers || 5}
            refetchOffers={refetch}
          />

          <div id="rcart-widget-games" style={{ scrollMarginTop: '1rem' }}>
            <SectionGames
              partnerCode={partnerCode}
              partnerName={storeName}
              maxIncompleteOffers={partnerSettings?.maxIncompleteOffers || 5}
              partnerSettings={partnerSettings}
              rewardAmount={Number(rewardAmount) || 0}
              bundleAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 0}
              onLogin={handleLogin}
              onStartGame={(selectedGame) => {
                // User started an offer from the list / activities area (not necessarily the hero game).
                // TODO: analytics — game_start (source: games)
                console.log("Start Game Clicked!", selectedGame);
              }}
              onSelectedGame={(selectedGame) => {
                // User highlighted or selected a game in the grid before starting.
                // TODO: analytics — game_selected (source: games)
                console.log("Selected Game!", selectedGame);
              }}
              onGameCTAClick={(selectedGame) => {
                // Extra CTA on a game row/card in SectionGames.
                // TODO: analytics — game_cta_click (source: games)
                console.log("Game CTA Clicked!", selectedGame);
              }}
              onTabChange={(tab) => {
                // Switches between e.g. “all games” vs “activities” inside SectionGames.
                // TODO: analytics — games_tab_change
                console.log("Games tab changed:", tab);
              }}
              games={gameList}
              activities={activities}
              loading={loading}
              error={error}
              refetchOffers={refetch}
              discountCode={discountCode || ""}
              onGenerateDiscountCode={handleGenerateDiscountCode}
              redirectUrl="https://example.com/"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
