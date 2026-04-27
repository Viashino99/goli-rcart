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
  ctaLabel?: string;
  logoutLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  isLoggedIn?: boolean;
  rewardAmount?: number;
  partnerSettings?: Record<string, any>;
  discountCode?: string;
  onCtaClick?: () => void;
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
            ) : (
              <button type="button" className={styles.cta} onClick={onCtaClick}>
                {ctaLabel}
              </button>
            )}
          </div>
        </div>
        {isLoggedIn && (
          <div
            className={
              styles.progressRewardContainer +
              (partnerSettings?.milestones?.[1]?.status === 'earned' ||
              partnerSettings?.milestones?.[1]?.status === 'claimed'
                ? ' ' + styles.lastClaim
                : '')
            }
          >
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
              redirectUrl="/collections/all"
              onClaimFirstMilestone={onClaimFirstMilestone}
              onClaimLastMilestone={onClaimLastMilestone}
              onGenerateDiscountCode={onGenerateDiscountCode}
            />
          </div>
        )}
      </div>
    </header>
  );
}
