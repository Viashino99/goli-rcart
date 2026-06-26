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
  discountCode?: string;
  islanding?: boolean;
  /** Staged progress bar inputs (the segmented "Install N games → $X" bar). */
  installsCount?: number;
  completionsCount?: number;
  installThreshold?: number;
  installRewardPerGame?: number;
  downfunnelThreshold?: number;
  bundleAmount?: number;
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
  className,
  style,
  isLoggedIn,
  rewardAmount,
  partnerSettings,
  discountCode,
  islanding,
  onLoginClick,
  onLogout,
  logoutLabel = 'Log out',
  onGenerateDiscountCode,
  onClaimFirstMilestone,
  onClaimLastMilestone,
  installsCount = 0,
  completionsCount = 0,
  installThreshold = 5,
  installRewardPerGame = 5,
  downfunnelThreshold = 3,
  bundleAmount = 175,
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

            {/* Games page: show the "$ earned" tracker when logged in; otherwise a Log in button
                that opens the email prompt (which implicitly logs them in). */}
            {!islanding &&
              (isLoggedIn ? (
                <ProgressAmount
                  amount={String(rewardAmount)}
                  thresholdAmount={Number(partnerSettings?.rewardGoal?.thresholdAmount) || 0}
                  textColor="#1e1e1e"
                  borderColor="#1e1e1e"
                />
              ) : (
                <button type="button" className={styles.loginBtn} onClick={onLoginClick}>
                  Log in
                </button>
              ))}
            {isLoggedIn && onLogout && (
              <button
                type="button"
                className={styles.rewards}
                onClick={onLogout}
                aria-label={logoutLabel}
              >
                {logoutLabel}
              </button>
            )}
            {!isLoggedIn && islanding && (
              <button type="button" className={styles.cta} onClick={onCtaClick}>
                {ctaLabel}
              </button>
            )}
          </div>
        </div>
        {!islanding && (
          <div className={styles.progressRewardContainer}>
            <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
              <StagedProgressBar
                installsCount={installsCount}
                installThreshold={installThreshold}
                installRewardPerGame={installRewardPerGame}
                completionsCount={completionsCount}
                downfunnelThreshold={downfunnelThreshold}
                bundleAmount={bundleAmount}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
