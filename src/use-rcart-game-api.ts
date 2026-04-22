import { useGameApi, type UseGameApiResult } from 'getjacked-components';

export type UseRcartGameApiArgs = {
  partnerCode: string;
  email: string | null;
};

/**
 * Thin wrapper around getjacked-components' useGameApi.
 *
 * Today this calls the hosted rcart API directly from the browser.
 * Later, you can change this file to call your own backend while
 * keeping the rest of the widget unchanged.
 */
export function useRcartGameApi({ partnerCode, email }: UseRcartGameApiArgs): UseGameApiResult {
  // IMPORTANT: keep arguments minimal (no secrets); email can also be
  // replaced with a hashed identifier later if you add a backend.
  return useGameApi(partnerCode, email ?? undefined);
}
