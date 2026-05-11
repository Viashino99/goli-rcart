import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import * as pixel from "./lib/fbpixel";
import styles from './components/storefront-header/StorefrontHeader.module.css';

export type RcartWidgetProps = {
  partnerCode: string;
  userId: string;
  email: string | null;
  storeName?: string;
  apiUrl?: string;
  shop?: string;
  /** Sent as `X-Api-Key` on `/api/discount` (theme setting or `VITE_RCART_API_KEY` at build). */
  apiKey?: string;
  logoSrc?: string;
  heroImageSrc?: string;
  stepImages?: [string, string, string];
};

/** Body shape for `POST /api/notify` milestone emails. */
export type NotifyMilestonePayload = {
  id: string;
  icon: 'welcome' | 'gift' | 'trophy' | 'star' | 'dollar' | 'reminder';
  label: string;
  price?: number;
  title?: string;
  description?: string;
  targetAmount?: number;
  discountCode?: string;
  ctaText?: string;
  calloutText?: string;
  status: 'locked' | 'earned' | 'claimed';
};

const WELCOME_NOTIFY_MILESTONE: NotifyMilestonePayload = {
  id: 'welcome',
  icon: 'welcome',
  label: 'Welcome',
  status: 'earned',
  ctaText: "Unlock $160 now",
  calloutText: "Unlock $160 now",
};

function isGamesHash(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hash === '#games';
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeLiquidEmail(propEmail: string | null): string | null {
  const t = propEmail?.trim() ?? '';
  return t && isPlausibleEmail(t) ? t : null;
}

function pickSessionAccountHash(sessionUser: unknown): string | null {
  if (!sessionUser || typeof sessionUser !== 'object') return null;
  const h = (sessionUser as { accountHash?: unknown }).accountHash;
  if (typeof h !== 'string') return null;
  const t = h.trim();
  return t.length > 0 ? t : null;
}

/** API: id 1 = install / surprise gift ($5), id 2 = bundle goal ($100). Falls back to comparing targetAmount against the bundle threshold. */
function earnedMilestoneTier(
  m: { id?: unknown; targetAmount?: unknown },
  rewardGoal?: { targetAmount?: unknown; thresholdAmount?: unknown },
): 'install' | 'bundle' | null {
  const id = Number(m.id);
  if (id === 1) return 'install';
  if (id === 2) return 'bundle';

  const t = Number(m.targetAmount);
  const bigGoal = Number(rewardGoal?.thresholdAmount);
  if (!isNaN(t) && !isNaN(bigGoal) && bigGoal > 0) {
    return t < bigGoal ? 'install' : 'bundle';
  }
  return null;
}

/**
 * Reads `?email=` / `?accountHash=` once at mount.
 * - No `email` or `accountHash` query keys → use Shopify/Liquid customer email only (never force empty).
 * - Either key present (magic link) → valid URL email wins; invalid/missing URL email falls back to Liquid so we do not clear the session.
 */
function readWidgetUrlParams(propEmail: string | null): { email: string | null; accountHash: string | null } {
  const liquid = normalizeLiquidEmail(propEmail);
  if (typeof window === 'undefined') {
    return { email: liquid, accountHash: null };
  }
  const params = new URLSearchParams(window.location.search);
  const hasEmailKey = params.has('email');
  const hasHashKey = params.has('accountHash');

  if (!hasEmailKey && !hasHashKey) {
    return { email: liquid, accountHash: null };
  }

  const rawEmail = params.get('email')?.trim() ?? '';
  const urlEmail = rawEmail && isPlausibleEmail(rawEmail) ? rawEmail : null;
  const rawHash = params.get('accountHash')?.trim() ?? '';
  const accountHash = rawHash.length > 0 ? rawHash : null;
  const email = urlEmail ?? liquid;

  return { email, accountHash };
}

function stripEmailAndAccountHashFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('email') && !url.searchParams.has('accountHash')) return;
  url.searchParams.delete('email');
  url.searchParams.delete('accountHash');
  const q = url.searchParams.toString();
  window.history.replaceState(null, '', `${url.pathname}${q ? `?${q}` : ''}${url.hash}`);
}

/** Survives StrictMode dev double-mount so `pageview` is not sent twice. */
let initialWidgetPageviewSent = false;

export function RcartWidget({
  partnerCode = 'goli',
  email,
  storeName = 'My Store',
  apiUrl = '',
  shop = '',
  apiKey = '',
  userId = '',
  logoSrc: logoSrcProp = '',
  heroImageSrc: heroImageSrcProp = '',
  stepImages = ['', '', ''],
}: RcartWidgetProps) {
  // One-time read of `?email=` / `?accountHash=` on first client render.
  const fromUrl = useMemo(() => readWidgetUrlParams(email), []);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(fromUrl.email);
  const urlAccountHashRef = useRef<string | null>(fromUrl.accountHash);
  const [showPage, setShowPage] = useState<'landing' | 'games'>(() =>
    isGamesHash() ? 'games' : 'landing',
  );
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const pendingWelcomeEmailRef = useRef(false);

  const { logout } = useLogout();
  const { games, activities, partnerSettings, rewardAmount, loading, error,sessionUser ,isNew , refetch } = useRcartGameApi({
    partnerCode,
    email: resolvedEmail,
  });

  console.log("sessionUserteststst", sessionUser);

  /** Magic-link `?accountHash=` wins; otherwise use persisted session hash from the game API. */
  const effectiveAccountHash = useMemo((): string | null => {
    const hashFromUrl = urlAccountHashRef.current?.trim();
    if (hashFromUrl) return hashFromUrl;
    return pickSessionAccountHash(sessionUser);
  }, [sessionUser]);

  const logoSrc = logoSrcProp;
  const heroImageSrc = heroImageSrcProp;
  const brandLabel = storeName?.trim() ? storeName : '';
  const heroGame = games?.[0];
  const gameList = games?.slice(1);

  const facebookPixelId = pixel.getFacebookPixelId() ?? '';
  const facebookAccessToken = pixel.getFacebookAccessToken() ?? '';

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!fromUrl.email);

  useEffect(() => {
    if (initialWidgetPageviewSent) return;
    initialWidgetPageviewSent = true;
    pixel.pageview();
  }, []);

  useEffect(() => {
    
    const onHashChange = () => {
      setShowPage(isGamesHash() ? 'games' : 'landing');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {

    console.log("stripEmailAndAccountHashFromUrl", resolvedEmail, isLoggedIn);
    if (typeof window === 'undefined') return;
    if (!resolvedEmail || !isLoggedIn) return;
    stripEmailAndAccountHashFromUrl();
  }, [resolvedEmail, isLoggedIn]);

  // Restore email from getjacked session when URL did not supply one (keeps returning visitors logged in).
  useEffect(() => {
    const u = sessionUser?.email?.trim();
    if (!u || !isPlausibleEmail(u) || resolvedEmail) return;
    setResolvedEmail(u);
    setIsLoggedIn(true);
  }, [sessionUser?.email, resolvedEmail]);

  const gotoGamesPage = () => {
    //TODO: Add shopify logic to redirect to the games page
    pixel.fbTracker("View Games", {
      email: resolvedEmail,
    });

    setShowPage('games');
    if (typeof window !== 'undefined') {
      if (window.location.hash !== '#games') {
        const { pathname, search } = window.location;
        window.history.replaceState(null, '', `${pathname}${search}#games`);
      }
      window.scrollTo({ top: 0 });
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
  const handleLogout = () => {
    // Clears persisted session (email + userId) via getjacked-components; keeps widget email in sync.
    // TODO: Add Shopify logout redirect / storefront session invalidation when integrated.
    setIsLoggedIn(false);
    setResolvedEmail(null);
    logout();
    gotoLandingPage?.();
    window.location.reload();
    console.log("Logged out");
  };

  const callDiscountApi = async (amount: 5 | 100): Promise<string | null> => {
    const key = apiKey?.trim();
    if (!apiUrl || !shop || !resolvedEmail || !key) {
      return null;
    }
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Api-Key': key,
      };
      const base = apiUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/discount`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          email: resolvedEmail,
          partnerCode: partnerCode,
          shop: shop,
          amount: amount,
          ...(effectiveAccountHash ? { accountHash: effectiveAccountHash } : {}),
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      console.log("callDiscountApi data: ", data);
      return data.code ?? null;
    } catch (error) {
      console.error('callDiscountApi error', error);
      return null;
    }
  };

  const callNotifyApi = useCallback(
    async (milestone: NotifyMilestonePayload, options?: { emailOverride?: string }) => {
      const effectiveEmail = options?.emailOverride ?? resolvedEmail;
      console.log('[notify] called', { milestone: milestone.id, effectiveEmail, apiUrl, shop });
      if (!apiUrl) { console.warn('[notify] skipped — apiUrl missing'); return; }
      if (!effectiveEmail) { console.warn('[notify] skipped — email missing'); return; }
      if (!shop) { console.warn('[notify] skipped — shop missing'); return; }
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        };
        const base = apiUrl.replace(/\/$/, '');
        const widgetUrl = typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : '';
        const body = JSON.stringify({
          userId,
          email: effectiveEmail,
          partnerCode,
          storeName,
          shopDomain: shop,
          widgetUrl,
          ...(effectiveAccountHash ? { accountHash: effectiveAccountHash } : {}),
          milestone: {
            id: milestone.id,
            icon: milestone.icon,
            label: milestone.label,
            ...(milestone.title != null ? { title: milestone.title } : {}),
            ...(milestone.description != null ? { description: milestone.description } : {}),
            ...(milestone.price != null ? { price: milestone.price } : {}),
            ...(milestone.targetAmount != null ? { targetAmount: milestone.targetAmount } : {}),
            ...(milestone.discountCode ? { discountCode: milestone.discountCode } : {}),
            ...(milestone.ctaText ? { ctaText: milestone.ctaText } : {}),
            ...(milestone.calloutText ? { calloutText: milestone.calloutText } : {}),
            status: milestone.status,
          },
        });
        console.log('[notify] POST', `${base}/api/notify`, JSON.parse(body));
        const res = await fetch(`${base}/api/notify`, { method: 'POST', headers, body });
        const text = await res.text();
        if (!res.ok) {
          console.error('[notify] API error', res.status, text);
        } else {
          console.log('[notify] success', res.status, text);
        }
      } catch (err) {
        console.error('[notify] fetch failed', err);
      }
    },
    [apiUrl, shop, apiKey, partnerCode, storeName, effectiveAccountHash, resolvedEmail, userId],
  );

  // Stable ref so the welcome-email effect always calls the latest callNotifyApi.
  const callNotifyApiRef = useRef(callNotifyApi);
  useEffect(() => { callNotifyApiRef.current = callNotifyApi; });

  // Send the welcome email once accountHash is available so the CTA button has a valid link.
  // pendingWelcomeEmailRef is set in handleLogin (never on session restore), so this
  // won't fire for returning visitors who already have a session.
  useEffect(() => {
    console.log("check-isNew: ", isNew);
    if (!pendingWelcomeEmailRef.current) return;
    if (!resolvedEmail || !effectiveAccountHash) return;
    pendingWelcomeEmailRef.current = false;
    // if (isNew !== true) return;
    void callNotifyApiRef.current(WELCOME_NOTIFY_MILESTONE);
  }, [resolvedEmail, effectiveAccountHash, isNew]);

  const handleLogin = (submittedEmail: string) => {
    // TODO: Add shopify login logic to login the user and then set the resolvedEmail
    pixel.fbTracker('Complete Registration', {
      email: submittedEmail,
    });
    setResolvedEmail(submittedEmail);
    setIsLoggedIn(true);
    gotoGamesPage?.();
    // Mark welcome email as pending — sent by the effect below once accountHash is ready,
    // so the CTA button in the email has a valid magic link.
    pendingWelcomeEmailRef.current = true;
  };


  const generateCodeForTier = async (preferHighest: boolean): Promise<string | null> => {
    const earnedSorted = [...((partnerSettings?.milestones as any[]) ?? [])]
      .filter((m) => m.status === 'earned' || m.status === 'claimed')
      .sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? ''), undefined, { numeric: true }));
    const earned = preferHighest ? earnedSorted.at(-1) : earnedSorted[0];

  
    if (!earned) return null;

    const tier = earnedMilestoneTier(earned, partnerSettings?.rewardGoal ?? undefined);
    if (!tier) return null;
  
    const discountAmount: 5 | 100 = tier === 'install' ? 5 : 100;
    const code = await callDiscountApi(discountAmount);
    if (!code) return null;

    setDiscountCode(code);
    void refetch();

    if (tier === 'install') {
      void callNotifyApiRef.current({
        id: 'first-reward',
        icon: 'dollar',
        label: 'Surprise Gift — $5 off',
        targetAmount: 5,
        status: 'claimed',
        discountCode: code,
      });
    } else {
      void callNotifyApiRef.current({
        id: 'goal-reached',
        icon: 'dollar',
        label: 'Bundle Goal Reached — $100 off',
        targetAmount: 100,
        status: 'claimed',
        discountCode: code,
      });
    }

    return code;
  };

  // SectionGames → ModalSurpriseGift (JM): called for the install/first ($5) milestone.
  const handleGenerateDiscountCode = () => generateCodeForTier(false);
  // StorefrontHeader → ProgressRewards → Xl: called only when the bundle ($100) milestone is earned.
  const handleGenerateBundleCode = () => generateCodeForTier(true);

  // These are called by ProgressRewards / ModalSurpriseGift when the user clicks
  // "Copy Code & Shop Now". Email is already sent in handleGenerateDiscountCode above.
  const handleFirstMilestoneClaim = () => {};
  const handleLastMilestoneClaim = () => {};

  return (
    <div>
      <StorefrontHeader
        partnerCode={partnerCode}
        partnerName={storeName}
        brandLabel={brandLabel}
        logoSrc={logoSrc}
        logoAlt={brandLabel}
        isLoggedIn={!!isLoggedIn}
        onCtaClick={gotoGamesPage}
        rewardAmount={rewardAmount || 0}
        partnerSettings={partnerSettings}
        discountCode={discountCode || ""}
        onLogout={handleLogout}
        onGenerateDiscountCode={handleGenerateBundleCode}
        onClaimFirstMilestone={handleFirstMilestoneClaim}
        onClaimLastMilestone={handleLastMilestoneClaim}
        islanding={showPage === 'landing' ? true : false}
        ctaLabel={"Unlock " + "$"+ (loading ? 0 : partnerSettings?.rewardGoal?.thresholdAmount || 0) + " now"}
      />

      {showPage === 'landing' ? (
        <>
          <SectionHero
            storeName={storeName}
            bundleAmount={partnerSettings?.rewardGoal?.thresholdAmount ?? rewardAmount}
            discountAmount={partnerSettings?.rewardGoal?.discount}
            onCTAClick={gotoGamesPage}
            to="#games"
            heroImageSrc={heroImageSrc}
            className={styles.goliHeroSection}
          />
          <SectionPartneredGames
              PixelId={facebookPixelId}
              PixelToken={facebookAccessToken}
              partnerCode={partnerCode}
              partnerName={storeName}
              maxIncompleteOffers={partnerSettings?.maxIncompleteOffers || 5}
              bundleAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 0}
              rewardAmount={Number(rewardAmount) || 0}
              activities={activities || []}
              partnerSettings={partnerSettings}
              onLogin={handleLogin}
              onBrowse={gotoGamesPage}
              to="#games"
              isLoggedIn={isLoggedIn}
              refetchOffers={refetch}
              onStartGame={(selectedGame) => {
                // User clicked the game CTA in the partnered games grid.
                // TODO: analytics — game_start (source: partnered games)
                console.log("Game Started!", selectedGame);
              }}
            />
          <SectionSteps
            partnerName={storeName}
            partnerCode={partnerCode}
            images={[
              stepImages[0],
              stepImages[1],
              stepImages[2],
            ]}
            ctaText="Start Playing"
            onCTAClick={gotoGamesPage}
            to="#games"
            bundleAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 0}
            discountAmount={Number(partnerSettings?.rewardGoal?.discount) || 0}
            installAmount={5}
            levelUpAmount={145}
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
            PixelId={facebookPixelId}
            PixelToken={facebookAccessToken}
            partnerCode={partnerCode}
            partnerName={storeName}
            game={heroGame}
            onCtaClick={() => {
              // User clicked the game hero CTA
              //TODO: Add shopify tracking here and internal logic.
              pixel.fbTracker("View Content", {
                ...heroGame
              });
          
              console.log("Game Hero CTA Clicked!");
            }}
            partnerSettings={partnerSettings}
            bundleAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 0}
            rewardAmount={Number(rewardAmount) || 0}
            onLogin={handleLogin}
            onStartGame={(selectedGame) => {
              // User clicked the game CTA in the partnered games grid.
              // TODO: analytics — game_start (source: partnered games)
              console.log("Game Started!", selectedGame);
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
            activities={activities || []}
            maxIncompleteOffers={partnerSettings?.maxIncompleteOffers || 5}
            refetchOffers={refetch}    
          />

          <div id="rcart-widget-games" style={{ scrollMarginTop: '1rem' }}>
            <SectionGames
              PixelId={facebookPixelId}
              PixelToken={facebookAccessToken}
              partnerCode={partnerCode}
              partnerName={storeName}
              maxIncompleteOffers={partnerSettings?.maxIncompleteOffers || 5}
              partnerSettings={partnerSettings}
              rewardAmount={Number(rewardAmount) || 0}
              bundleAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 0}
              onLogin={handleLogin}
              onStartGame={(selectedGame) => {
                // User clicked the game CTA in the games grid.
                // TODO: analytics — game_start (source: games)
                console.log("Game Started!", selectedGame);
              }}
              onSelectedGame={(selectedGame) => {
                // User highlighted or selected a game in the grid before starting.
                // TODO: analytics — game_selected (source: games)
                pixel.fbTracker("View Content", {
                  ...selectedGame
                });
            
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
              onGenerateDiscountCodeBundle={handleGenerateBundleCode}
              redirectUrl="/collections/all"
              isLoggedIn={isLoggedIn}
              onClaimFirstMilestone={handleFirstMilestoneClaim}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
