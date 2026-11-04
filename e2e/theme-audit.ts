import type { Page } from '@playwright/test';

// Buttons animate `color` for 160ms (actions.css), so a contrast audit that starts right
// after a theme change can measure the previous theme's text over the new background.
export async function settleStyleTransitions(page: Page) {
  await page.evaluate(async () => {
    // getAnimations() flushes styles, so transitions triggered by the change are included.
    // Hidden targets are skipped: inside a closed <details>, Chromium never resolves `finished`.
    const running = document.getAnimations().filter(animation => animation instanceof CSSTransition
      && (animation.effect as KeyframeEffect | null)?.target?.checkVisibility());
    await Promise.all(running.map(transition => transition.finished.catch(() => undefined)));
  });
}

export async function applyThemeForAudit(page: Page, theme: string) {
  await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
  await settleStyleTransitions(page);
}
