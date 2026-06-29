import React, { type ReactNode } from 'react';
import styles from './StorefrontHeader.module.css';
import { OnGenerateDiscountCode, ProgressAmount, StagedProgressBar } from 'getjacked-components';


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
  ctaLabel?: string;
  logoutLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  isLoggedIn?: boolean;
  rewardAmount?: number;
  partnerSettings?: Record<string, any>;
  installsCount?: number;
  completionsCount?: number;
  discountCode?: string;
  islanding?: boolean;
  onCtaClick?: () => void;
  onLoginClick?: () => void;
  onLogout?: () => void;
  onGenerateDiscountCode?: OnGenerateDiscountCode;
  onClaimFirstMilestone?: () => void;
  onClaimLastMilestone?: () => void;
};

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
  ctaLabel = 'Start Earning Now',
  onCtaClick,
  onLoginClick,
  className,
  style,
  isLoggedIn,
  rewardAmount,
  partnerSettings,
  installsCount = 0,
  completionsCount = 0,
  discountCode,
  islanding,
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
              </>
            ) : islanding ? (
              <button type="button" className={styles.cta} onClick={onCtaClick}>
                {ctaLabel}
              </button>
            ) : (
              // Games page, logged out: a Log in button that opens the email prompt (which logs them in).
              <button type="button" className={styles.loginBtn} onClick={onLoginClick}>
                Log in
              </button>
            )}
          </div>
        </div>
        {!islanding && (
          <div
            className={
              styles.progressRewardContainer +
              (partnerSettings?.milestones?.[1]?.status === 'earned' ||
              partnerSettings?.milestones?.[1]?.status === 'claimed'
                ? ' ' + styles.lastClaim
                : '')
            }
          >
            <StagedProgressBar
              installsCount={installsCount}
              completionsCount={completionsCount}
              installThreshold={5}
              installRewardPerGame={5}
              downfunnelThreshold={3}
              bundleAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 175}
              bundleCouponAmount={150}
              partnerName={partnerName}
              discountCode={isLoggedIn ? discountCode : ''}
              redirectUrl="/collections/all"
              onGenerateDiscountCode={onGenerateDiscountCode}
            />
          </div>
        )}
      </div>
    </header>
  );
}
