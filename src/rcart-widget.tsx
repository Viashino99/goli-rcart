import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SectionGames,
  SectionGameHero,
  SectionSteps,
  SectionTestimonials,
  SectionFaq,
  useLogout,
  HeroSection,
  GamesSection,
} from 'getjacked-components';
import { StorefrontHeader } from './components/storefront-header';
import { useRcartGameApi } from './use-rcart-game-api';
import * as pixel from "./lib/fbpixel";
import { FB_ACCESS_TOKEN } from "./lib/fbpixel";

export type RcartWidgetProps = {
  partnerCode: string;
  userId: string;
  email: string | null;
  storeName?: string;
  apiUrl?: string;
  shop?: string;
  debugMode?: boolean;
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
  ctaText: "Unlock $175 now",
  calloutText: "Unlock $175 now",
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

/** API: id 1 = install / surprise gift ($25), id 2 = bundle goal ($175). Falls back to comparing targetAmount against the bundle threshold. */
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
  debugMode = false,
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
  const [pendingWelcomeEmail, setPendingWelcomeEmail] = useState<string | null>(null);

  const { logout } = useLogout();
  const { games, activities, partnerSettings, rewardAmount, loading, error, sessionUser, isNew, refetch } = useRcartGameApi({
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

  // --- RCart reward overhaul (dev-store UI preview) -------------------------------
  // Staged single-pane: once the shopper has 5 confirmed installs, the flow swaps from
  // "install games" to "my activity" (downfunnel). Display amounts are overridden to the
  // new model ($5/install, Tier 1 "Surprise Gift" $25 at 5 installs, each downfunnel +$50,
  // Tier 2 total $175) so the preview reads correctly without touching the live
  // partner_setting. Mint stays host-side.
  const INSTALL_REWARD = 5;
  const INSTALL_THRESHOLD = 5;
  const installGoal = INSTALL_THRESHOLD * INSTALL_REWARD; // $25 — first reward tier
  const BUNDLE_AMOUNT = 175; // $25 install tier + 3 downfunnel x $50 — DISPLAY total only
  // We mint TWO separate coupons: $25 (first/install) + $150 (second). $25 + $150 = $175 total.
  // BUNDLE_AMOUNT (175) is the displayed total; the actual SECOND code we mint is $150.
  const SECOND_CODE_AMOUNT = 150;
  const installsCount = (activities ?? []).filter((a) => a?.installed).length;
  const inActivityStage = installsCount >= INSTALL_THRESHOLD;
  const completionsCount = (activities ?? []).filter(
    (a) => a?.steps?.length > 0 && a.steps[a.steps.length - 2]?.status === "completed",
  ).length;
  const effectiveRewardAmount =
    Math.min(installsCount, INSTALL_THRESHOLD) * INSTALL_REWARD + completionsCount * 50;
  const effectivePartnerSettings = partnerSettings
    ? {
        ...partnerSettings,
        installPoints: INSTALL_REWARD,
        rewardGoal: {
          ...partnerSettings.rewardGoal,
          thresholdAmount: BUNDLE_AMOUNT,
          discount: String(BUNDLE_AMOUNT),
        },
        milestones: [
          { targetAmount: installGoal, label: `$${installGoal} Goli Cash`, icon: "gift" as const },
          { targetAmount: BUNDLE_AMOUNT, label: `$${BUNDLE_AMOUNT} Goli Cash`, icon: "dollar" as const },
        ].map((m, i) => {
          // Demo economics drive milestone state locally: tier 1 ($25) earns at 5 installs,
          // tier 2 ($175 cumulative) at 3 downfunnel completions. The live partner_setting
          // uses different thresholds (3 installs / $15 / $160) which we intentionally ignore.
          const reached = i === 0 ? installsCount >= INSTALL_THRESHOLD : completionsCount >= 3;
          const serverStatus = partnerSettings.milestones?.[i]?.status;
          return {
            id: partnerSettings.milestones?.[i]?.id ?? String(i + 1),
            status: serverStatus === "claimed" ? "claimed" : reached ? "earned" : ("locked" as const),
            price: partnerSettings.milestones?.[i]?.price,
            ...m,
          };
        }),
      }
    : partnerSettings;

  // Same data transform the harness applies: surface each game's price as the $5 install
  // reward, and rewrite step prices to the new model (step 0 = $5 install, step 1 = $50
  // downfunnel) so ModalGame / cards read the right amounts instead of raw API values.
  const displayGames = (games ?? []).map((g) => ({
    ...g,
    price: INSTALL_REWARD,
    steps: (g.steps ?? []).map((s, i) => ({
      ...s,
      price: i === 0 ? INSTALL_REWARD : i === 1 ? 50 : s.price ?? 0,
    })),
  }));
  const heroGame = displayGames[0];
  const gameList = displayGames.slice(1);
  // Activities are the user's in-progress games; apply the same $5/$50 step rewrite so the
  // activity cards show the new downfunnel economics (+$50) instead of raw API values, and
  // surface each activity's earned total as the sum of its completed (rewritten) step prices.
  const displayActivities = (activities ?? []).map((a) => {
    const steps = (a.steps ?? []).map((s, i) => ({
      ...s,
      price: i === 0 ? INSTALL_REWARD : i === 1 ? 50 : s.price ?? 0,
    }));
    const earned = steps.reduce(
      (sum, s) => sum + (s.status === "completed" ? Number(s.price) || 0 : 0),
      0,
    );
    return { ...a, price: earned, steps };
  });
  // -------------------------------------------------------------------------------

  const facebookPixelId = pixel.getFacebookPixelId() ?? '';

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!fromUrl.email);
  // Bumped by the header "Log in" button to open SectionGames' email/login modal.
  const [loginSignal, setLoginSignal] = useState(0);

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

  const notifyClaimInstallSentRef = useRef(false);
  const notifyClaimBundleSentRef = useRef(false);

  const callDiscountApi = async (amount: number): Promise<{ code: string; reused: boolean } | null> => {
    if (!apiUrl || !shop || !resolvedEmail) {
      if (debugMode) console.warn('[DEBUG][discount] skipped — missing:', { apiUrl: !!apiUrl, shop: !!shop, email: !!resolvedEmail });
      return null;
    }
    try {
      const base = apiUrl.replace(/\/$/, '');
      const requestBody = { userId, email: resolvedEmail, partnerCode, shop, amount };
      if (debugMode) console.log('[DEBUG][discount] POST', `${base}/api/widget/discount`, requestBody);
      const res = await fetch(`${base}/api/widget/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (debugMode) console.log('[DEBUG][discount] response', res.status, data);
      if (!res.ok) return null;
      return data.code != null ? { code: data.code, reused: data.reused ?? false } : null;
    } catch (error) {
      console.error('[DEBUG][discount] fetch failed', error);
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
        const base = apiUrl.replace(/\/$/, '');
        const widgetUrl = typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : '';
        const requestBody = {
          userId,
          email: effectiveEmail,
          partnerCode,
          shop,
          storeName,
          widgetUrl,
          ...(effectiveAccountHash ? { accountHash: effectiveAccountHash } : {}),
          icon: milestone.icon,
          label: milestone.label,
          ...(milestone.title != null ? { title: milestone.title } : {}),
          ...(milestone.description != null ? { description: milestone.description } : {}),
          ...(milestone.price != null ? { price: milestone.price } : {}),
          ...(milestone.targetAmount != null ? { targetAmount: milestone.targetAmount } : {}),
          ...(milestone.discountCode ? { discountCode: milestone.discountCode } : {}),
        };
        if (debugMode) console.log('[DEBUG][notify] POST', `${base}/api/widget/notify`, requestBody);
        const res = await fetch(`${base}/api/widget/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        const responseText = await res.text();
        if (debugMode) console.log('[DEBUG][notify] response', res.status, responseText);
        if (!res.ok) {
          console.error('[notify] API error', res.status, responseText);
        }
      } catch (err) {
        console.error('[notify] fetch failed', err);
      }
    },
    [apiUrl, shop, partnerCode, storeName, effectiveAccountHash, resolvedEmail, userId],
  );

  // Stable ref so the welcome-email effect always calls the latest callNotifyApi.
  const callNotifyApiRef = useRef(callNotifyApi);
  useEffect(() => { callNotifyApiRef.current = callNotifyApi; });

  // Send the welcome email only to genuinely new users, and only once we have an
  // accountHash (needed for the CTA link in the email). isNew comes from the game API
  // response after the email is resolved — that's why we defer via state rather than
  // calling directly in handleLogin.
  useEffect(() => {
    if (debugMode) console.error('[DEBUG][welcome-effect] fired', { pendingWelcomeEmail, effectiveAccountHash, isNew });
    if (!pendingWelcomeEmail) return;
    if (!effectiveAccountHash) { if (debugMode) console.error('[DEBUG][welcome-effect] waiting — no accountHash yet'); return; }
    if (!isNew) {
      console.error('[welcome-effect] skipped — isNew is false (existing user or API not yet responded)');
      return;
    }
    if (debugMode) console.error('[DEBUG][welcome-effect] sending welcome email to', pendingWelcomeEmail);
    setPendingWelcomeEmail(null);
    void callNotifyApiRef.current(WELCOME_NOTIFY_MILESTONE, { emailOverride: pendingWelcomeEmail });
  }, [pendingWelcomeEmail, effectiveAccountHash, isNew]);

  const handleLogin = (submittedEmail: string) => {
    if (debugMode) console.error('[DEBUG][handleLogin] called with', submittedEmail);
    pixel.fbTracker('Complete Registration', { email: submittedEmail });
    setResolvedEmail(submittedEmail);
    setIsLoggedIn(true);
    setPendingWelcomeEmail(submittedEmail);
    gotoGamesPage?.();
    if (debugMode) console.error('[DEBUG][handleLogin] pendingWelcomeEmail set to', submittedEmail);
  };


  const generateCodeForTier = async (preferHighest: boolean): Promise<string | null> => {
    const earnedSorted = [...((partnerSettings?.milestones as any[]) ?? [])]
      .filter((m) => m.status === 'earned' || m.status === 'claimed')
      .sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? ''), undefined, { numeric: true }));
    const earned = preferHighest ? earnedSorted.at(-1) : earnedSorted[0];

  
    if (!earned) return null;

    const tier = earnedMilestoneTier(earned, partnerSettings?.rewardGoal ?? undefined);
    if (!tier) return null;

    const discountAmount = tier === 'install' ? installGoal : SECOND_CODE_AMOUNT;
    const discount = await callDiscountApi(discountAmount);
    if (!discount) return null;

    const { code, reused } = discount;
    console.error('[generateCodeForTier]', { tier, code, reused, installSent: notifyClaimInstallSentRef.current, bundleSent: notifyClaimBundleSentRef.current });

    setDiscountCode(code);
    void refetch();

    if (reused) {
      console.error('[generateCodeForTier] code was reused — skipping claim email');
    } else if (tier === 'install' && notifyClaimInstallSentRef.current) {
      console.error('[generateCodeForTier] install email already sent this session — skipping');
    } else if (tier === 'bundle' && notifyClaimBundleSentRef.current) {
      console.error('[generateCodeForTier] bundle email already sent this session — skipping');
    }

    if (!reused) {
      if (tier === 'install' && !notifyClaimInstallSentRef.current) {
        notifyClaimInstallSentRef.current = true;
        console.error('[generateCodeForTier] sending install claim email');
        void callNotifyApiRef.current({
          id: 'first-reward',
          icon: 'dollar',
          label: `$${installGoal} Goli Cash`,
          targetAmount: installGoal,
          status: 'claimed',
          discountCode: code,
        });
      } else if (tier === 'bundle' && !notifyClaimBundleSentRef.current) {
        notifyClaimBundleSentRef.current = true;
        console.error('[generateCodeForTier] sending bundle claim email');
        void callNotifyApiRef.current({
          id: 'goal-reached',
          icon: 'dollar',
          label: `Bundle Goal Reached — $${SECOND_CODE_AMOUNT} off`,
          targetAmount: SECOND_CODE_AMOUNT,
          status: 'claimed',
          discountCode: code,
        });
      }
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

  const [debugStatus, setDebugStatus] = React.useState<string>('');
  const [debugEmail, setDebugEmail] = React.useState<string>('');

  return (
    <div>
      {debugMode && (
        <div style={{ background: '#1a1a2e', color: '#e0e0ff', fontFamily: 'monospace', fontSize: '12px', padding: '12px 16px', borderBottom: '2px solid #ff4444' }}>
          <strong style={{ color: '#ff4444' }}>⚠ DEBUG MODE</strong>
          <div style={{ marginTop: 8, lineHeight: 1.7 }}>
            <div>apiUrl: <span style={{ color: '#7fff7f' }}>{apiUrl || '❌ missing'}</span></div>
            <div>shop: <span style={{ color: '#7fff7f' }}>{shop || '❌ missing'}</span></div>
            <div>email (session): <span style={{ color: '#7fff7f' }}>{resolvedEmail || '❌ missing'}</span></div>
            <div>userId: <span style={{ color: '#7fff7f' }}>{userId || '(empty)'}</span></div>
            <div>partnerCode: <span style={{ color: '#7fff7f' }}>{partnerCode || '❌ missing'}</span></div>
            <div>accountHash: <span style={{ color: '#7fff7f' }}>{effectiveAccountHash || '(none yet)'}</span></div>
            <div>isNew: <span style={{ color: isNew ? '#7fff7f' : '#ff8888' }}>{isNew ? 'true ✓ (welcome email will fire)' : 'false ✗ (welcome email blocked)'}</span></div>
            <div>pendingWelcomeEmail: <span style={{ color: '#7fff7f' }}>{pendingWelcomeEmail || '(none)'}</span></div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder={resolvedEmail || 'override email…'}
              value={debugEmail}
              onChange={(e) => setDebugEmail(e.target.value)}
              style={{ background: '#0d0d1a', color: '#e0e0ff', border: '1px solid #444', borderRadius: 4, padding: '5px 10px', fontFamily: 'monospace', fontSize: '12px', width: 220 }}
            />
            <button
              onClick={async () => {
                const email = debugEmail.trim() || resolvedEmail || '';
                if (!email) { setDebugStatus('❌ enter an email first'); return; }
                setDebugStatus('sending welcome email…');
                await callNotifyApiRef.current(WELCOME_NOTIFY_MILESTONE, { emailOverride: email });
                setDebugStatus('done — check console + Vercel logs');
              }}
              style={{ background: '#ff4444', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace' }}
            >
              Send Welcome Email
            </button>
            <button
              onClick={async () => {
                setDebugStatus('requesting discount code…');
                const result = await callDiscountApi(installGoal);
                setDebugStatus(result ? `✅ code: ${result.code}${result.reused ? ' (reused)' : ''}` : '❌ no code returned — check console');
              }}
              style={{ background: '#444', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace' }}
            >
              Test ${installGoal} Discount
            </button>
          </div>
          {debugStatus && <div style={{ marginTop: 8, color: '#ffd700' }}>{debugStatus}</div>}
        </div>
      )}
      <StorefrontHeader
        partnerCode={partnerCode}
        partnerName={storeName}
        brandLabel={brandLabel}
        logoSrc={logoSrc}
        logoAlt={brandLabel}
        isLoggedIn={!!isLoggedIn}
        onCtaClick={gotoGamesPage}
        onLoginClick={() => setLoginSignal((s) => s + 1)}
        rewardAmount={effectiveRewardAmount || 0}
        partnerSettings={effectivePartnerSettings}
        discountCode={discountCode || ""}
        onLogout={handleLogout}
        onGenerateDiscountCode={handleGenerateBundleCode}
        onClaimFirstMilestone={handleFirstMilestoneClaim}
        onClaimLastMilestone={handleLastMilestoneClaim}
        islanding={showPage === 'landing' ? true : false}
        ctaLabel={"Get $" + (loading ? 0 : effectivePartnerSettings?.rewardGoal?.thresholdAmount || 0)}
        installsCount={installsCount}
        completionsCount={completionsCount}
        installThreshold={INSTALL_THRESHOLD}
        installRewardPerGame={INSTALL_REWARD}
        downfunnelThreshold={3}
        bundleAmount={BUNDLE_AMOUNT}
      />

      {showPage === 'landing' ? (
        <>
          <HeroSection
            bundleAmount={BUNDLE_AMOUNT}
            installGoal={installGoal}
            heroImageSrc={heroImageSrc}
            onCTAClick={gotoGamesPage}
          />
          <GamesSection
            games={displayGames}
            installGoal={installGoal}
            bundleAmount={BUNDLE_AMOUNT}
            onPlay={(g) => {
              // Navigate to #games and let SectionGames open its OWN install modal (with QR +
              // full tracking) for this game — it reads the `gj_game_modal=<offerId>` deep-link
              // param on mount. This is the exact same modal you'd get clicking from the games page.
              if (typeof window !== 'undefined' && g.offerId) {
                const url = new URL(window.location.href);
                url.searchParams.set('gj_game_modal', g.offerId);
                window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
              }
              gotoGamesPage();
            }}
            onBrowse={gotoGamesPage}
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
            bundleAmount={BUNDLE_AMOUNT}
            discountAmount={BUNDLE_AMOUNT}
            installAmount={INSTALL_REWARD}
            levelUpAmount={50}
          />
          {/* "How It Works" — relocated below "How to Maximize Your Cash" (SectionSteps). */}
          <div className="bg-white px-4 py-8 flex justify-center font-sans">
            <div className="border border-black/15 rounded-md p-4 max-w-[900px] w-full">
              <p className="text-[#1a1a2e] text-[14px] md:text-[15px] leading-[1.5] text-center">
                <span className="font-bold">How It Works: </span>
                Install {INSTALL_THRESHOLD} games → get ${installGoal}. Keep playing → unlock up to ${BUNDLE_AMOUNT}.
              </p>
            </div>
          </div>
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
          {!inActivityStage && (
          <SectionGameHero
            PixelId={facebookPixelId}
            PixelToken=""
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
            partnerSettings={effectivePartnerSettings}
            bundleAmount={Number(effectivePartnerSettings?.rewardGoal?.thresholdAmount) || 0}
            rewardAmount={Number(effectiveRewardAmount) || 0}
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
            activities={displayActivities}
            maxIncompleteOffers={partnerSettings?.maxIncompleteOffers || 5}
            refetchOffers={refetch}
          />
          )}

          <div id="rcart-widget-games" style={{ scrollMarginTop: '1rem' }}>
            <SectionGames
              stagedSinglePane
              installThreshold={INSTALL_THRESHOLD}
              PixelId={facebookPixelId}
              PixelToken={FB_ACCESS_TOKEN ?? ''}
              partnerCode={partnerCode}
              partnerName={storeName}
              maxIncompleteOffers={partnerSettings?.maxIncompleteOffers || 5}
              partnerSettings={effectivePartnerSettings}
              rewardAmount={Number(effectiveRewardAmount) || 0}
              bundleAmount={Number(effectivePartnerSettings?.rewardGoal?.thresholdAmount) || 0}
              onLogin={handleLogin}
              openLoginSignal={loginSignal}
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
              activities={displayActivities}
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
