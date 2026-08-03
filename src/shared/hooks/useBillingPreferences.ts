import { useCallback, useEffect, useState } from 'react';

const SHOW_PRICES_KEY = 'hemodinks.billing.show-prices';

function loadShowPricesPreference() {
  return localStorage.getItem(SHOW_PRICES_KEY) === 'true';
}

export function useBillingPreferences() {
  const [showPrices, setShowPricesState] = useState(loadShowPricesPreference);

  useEffect(() => {
    localStorage.setItem(SHOW_PRICES_KEY, String(showPrices));
  }, [showPrices]);

  const setShowPrices = useCallback((visible: boolean) => {
    setShowPricesState(visible);
  }, []);

  return { showPrices, setShowPrices };
}
