import React, { type ReactNode } from 'react';
import styles from './StorefrontHeader.module.css';
import { OnGenerateDiscountCode, ProgressAmount, ProgressRewards } from 'getjacked-components';


export type StorefrontHeaderProps = {
  partnerName: string;
  partnerCode: string;
  brandLabel: string;
  /** Renders instead of `brandLabel` when set (e.g. custom SVG or markup). */
  logo?: ReactNode;
  /** Convenience: renders an `<img>` instead of `brandLabel` when set (ignored if `logo` is set). */
  logoSrc?: string;
  /** Alt text for `logoSrc`; defaults to `brandLabel`. */
  logoAlt?: string;
  rewardsLabel?: string;
  onRewardsClick?: () => void;
  ctaLabel?: string;
  onCtaClick?: () => void;
  onCartClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  isLoggedIn?: boolean;
  isLandingPage?: boolean;
  rewardAmount?: number;
  thresholdAmount?: number;
  partnerSettings?: Record<string, any>;
  discountCode?: string;
  onLogout?: () => void;
  logoutLabel?: string;
  onGenerateDiscountCode?: OnGenerateDiscountCode;
  onClaimFirstMilestone?: () => void;
  onClaimLastMilestone?: () => void;
};

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
        fill="currentColor"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M17.8841 18.8103C16.5544 17.0943 14.4995 16 12 16C9.50054 16 7.44562 17.0943 6.11594 18.8103M17.8841 18.8103C19.7925 17.16 21 14.721 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 14.721 4.20753 17.16 6.11594 18.8103M17.8841 18.8103C16.3063 20.1747 14.2495 21 12 21C9.75046 21 7.69368 20.1747 6.11594 18.8103" stroke="black" stroke-width="2" stroke-linejoin="round"/>
      <path d="M15 10C15 11.6569 13.6569 13 12 13C10.3431 13 9 11.6569 9 10C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10Z" stroke="black" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  );
}

function BrandBlock({
  brandLabel,
  logo,
  logoSrc,
  logoAlt,
}: Pick<StorefrontHeaderProps, 'brandLabel' | 'logo' | 'logoSrc' | 'logoAlt'>) {
  if (logo != null) {
    return <div className={styles.brandSlot}>{logo}</div>;
  }
  if (logoSrc?.trim()) {
    return (
      <div className={styles.brandSlot}>
        <img
          className={styles.brandLogoImg}
          src={logoSrc}
          alt={logoAlt ?? brandLabel}
        />
      </div>
    );
  }
  return (
    <div className={styles.brandSlot}>
      <p className={styles.brand}>{brandLabel}</p>
    </div>
  );
}

export function StorefrontHeader({
  partnerCode,
  partnerName,
  brandLabel,
  logo,
  logoSrc,
  logoAlt,
  rewardsLabel = 'Rewards',
  onRewardsClick,
  ctaLabel = 'Start Earning Now',
  onCtaClick,
  onCartClick,
  className,
  style,
  isLandingPage,
  isLoggedIn,
  rewardAmount,
  thresholdAmount,
  partnerSettings,
  discountCode,
  onLogout,
  logoutLabel = 'Log out',
  onGenerateDiscountCode,
  onClaimFirstMilestone,
  onClaimLastMilestone,
}: StorefrontHeaderProps) {
  return (
    <header
      className={[styles.shell, className].filter(Boolean).join(' ')}
      style={style}
      role="banner"
    >
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <BrandBlock brandLabel={brandLabel} logo={logo} logoSrc={logoSrc} logoAlt={logoAlt} />
          <div className={styles.right}>
            {/* <button type="button" className={styles.rewards} onClick={onRewardsClick}>
              {rewardsLabel}
            </button> */}

            {isLoggedIn ? (
              <>
              
                {onLogout && (
                  <button
                    type="button"
                    className={styles.rewards}
                    onClick={onLogout}
                    aria-label={logoutLabel}
                  >
                    {logoutLabel}
                  </button>
                )}

                <ProgressAmount
                  amount={String(rewardAmount)}
                  thresholdAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 0}
                  textColor="#1e1e1e"
                  borderColor="#1e1e1e"
                />
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={onCartClick}
                  aria-label="Open cart"
                >
                  <CartIcon />
                </button>
              </>
            ) : (
              <button type="button" className={styles.cta} onClick={onCtaClick}>
                {ctaLabel}
              </button>
            )}
          </div>
        </div>

        <div className={styles.progressRewardContainer}>
          <ProgressRewards
            partnerName={partnerName}
            milestones={partnerSettings?.milestones || []}
            rewardAmount={rewardAmount || 0}
            discountAmount={Number(partnerSettings?.rewardGoal?.discount) || 0}
            goalAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 0}
            code={discountCode || ''}
            onCopyWithRedirect={() => {
              console.log('Copy with redirect');
            }}
            onClaimLater={() => {
              console.log('Claim later');
            }}
            redirectUrl="https://example.com/"
            onClaimFirstMilestone={onClaimFirstMilestone}
            onClaimLastMilestone={onClaimLastMilestone}
            onGenerateDiscountCode={onGenerateDiscountCode}
          />
        </div>
      </div>
    </header>
  );
}
