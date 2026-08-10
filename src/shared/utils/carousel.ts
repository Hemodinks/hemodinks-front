import type { MouseEvent } from 'react';

export function scrollListCarousel(event: MouseEvent<HTMLButtonElement>, direction: 'previous' | 'next') {
  const carousel = event.currentTarget
    .closest('.carousel-shell')
    ?.querySelector<HTMLElement>('.list-carousel-wrap');

  if (!carousel) {
    return;
  }

  const delta = carousel.clientWidth * (direction === 'next' ? 0.86 : -0.86);
  carousel.scrollBy({ left: delta, behavior: 'smooth' });
}
