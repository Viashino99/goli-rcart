import React, { useEffect, useRef, useState } from 'react';
import {
  SectionHero,
  SectionGames,
  SectionGameHero,
  SectionSteps,
  SectionTestimonials,
  SectionFaq,
  useLogout,
  SectionPartneredGames
} from 'getjacked-components';
import { StorefrontHeader } from './components/storefront-header';
import { useRcartGameApi } from './use-rcart-game-api';

export type RcartWidgetProps = {
  partnerCode: string;
  email: string | null;
  storeName?: string;
  apiUrl?: string;
  shop?: string;
};

function isGamesHash(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hash === '#games';
}

export function RcartWidget({ partnerCode = 'goli', email, storeName = 'My Store', apiUrl = '', shop = '' }: RcartWidgetProps) {
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(email);
  const [showPage, setShowPage] = useState<'landing' | 'games'>(() =>
    isGamesHash() ? 'games' : 'landing',
  );
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const prevActivityCount = useRef<number>(0);

  const { logout } = useLogout();
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
    callNotifyApi('welcome', 'Welcome', { emailOverride: submittedEmail });
  };
  const handleLogout = () => {
    // Clears persisted session (email + userId) via getjacked-components; keeps widget email in sync.
    // TODO: Add Shopify logout redirect / storefront session invalidation when integrated.
    logout();
    setResolvedEmail(null);
    console.log("Logged out");
  };

  const callDiscountApi = async (amount: 5 | 100): Promise<string | null> => {
    if (!apiUrl || !shop || !resolvedEmail) return null;
    try {
      const res = await fetch(`${apiUrl}/api/widget/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resolvedEmail, email: resolvedEmail, partnerCode, shop, amount }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.code ?? null;
    } catch {
      return null;
    }
  };

  const callNotifyApi = async (
    icon: 'welcome' | 'gift' | 'trophy' | 'dollar',
    label: string,
    extra?: { price?: number; targetAmount?: number; discountCode?: string; emailOverride?: string },
  ) => {
    const effectiveEmail = extra?.emailOverride ?? resolvedEmail;
    if (!apiUrl || !effectiveEmail || !shop) return;
    try {
      await fetch(`${apiUrl}/api/widget/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveEmail,
          email: effectiveEmail,
          partnerCode,
          shop,
          storeName,
          icon,
          label,
          ...extra,
        }),
      });
    } catch { /* non-blocking */ }
  };

  const handleGenerateDiscountCode = async () => {
    const code = await callDiscountApi(100);
    if (code) setDiscountCode(code);
  };

  const handleFirstMilestoneClaim = async () => {
    const code = await callDiscountApi(5);
    if (code) setDiscountCode(code);
    await callNotifyApi('gift', 'First Reward — $15', { price: 5, discountCode: code ?? undefined });
  };

  const handleLastMilestoneClaim = async () => {
    const code = await callDiscountApi(100);
    if (code) setDiscountCode(code);
    await callNotifyApi('dollar', '$160 Goal Reached', { targetAmount: 160, discountCode: code ?? undefined });
  };

  // Task 3: send trophy email each time a new game step activity is completed
  useEffect(() => {
    const count = activities?.length ?? 0;
    if (resolvedEmail && count > prevActivityCount.current && prevActivityCount.current > 0) {
      callNotifyApi('trophy', 'Game step completed');
    }
    prevActivityCount.current = count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities?.length]);


  return (
    <div>
      <StorefrontHeader
        partnerCode={partnerCode}
        partnerName={storeName}
        brandLabel={brandLabel}
        logoSrc='' //TODO: Add logo src
        logoAlt={brandLabel} //TODO: Add logo alt
        isLoggedIn={!!isLoggedIn}
        onCtaClick={gotoGamesPage}
        rewardAmount={rewardAmount || 0}
        partnerSettings={partnerSettings}
        discountCode={discountCode || ""}
        onLogout={handleLogout}
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
          <SectionFaq
            partnerCode={partnerCode}
            partnerName={storeName}
          />

          <SectionTestimonials
            partnerCode={partnerCode}
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
            activities={resolvedEmail ? activities : []}
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
              isLoggedIn={!!resolvedEmail}
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
