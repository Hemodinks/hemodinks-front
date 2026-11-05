import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { BillingRankingPanel } from './BillingPageComponents';
import type { BillingBreakdownItem } from './billingUtils';

const item = { label: 'Ana Hemodinks', totalRecords: 2, pendingCount: 1, totalGrossAmount: 300, totalNetAmount: 250 } as BillingBreakdownItem;

it('começa fechado e alterna os itens pelo título', async () => {
  const user = userEvent.setup();
  render(<BillingRankingPanel title="Cirurgiões" subtitle="Equipe" items={[item]} emptyLabel="Nenhum cirurgião." />);
  const summary = screen.getByRole('heading', { name: 'Cirurgiões' }).closest('summary')!;
  const label = screen.getByText('Ana Hemodinks');
  expect(label).not.toBeVisible();

  await user.click(summary);
  expect(label).toBeVisible();

  await user.click(summary);
  expect(label).not.toBeVisible();
});

it('mostra a mensagem de lista vazia ao abrir', async () => {
  const user = userEvent.setup();
  render(<BillingRankingPanel title="Pagadores" subtitle="Convênios" items={[]} emptyLabel="Nenhum convênio." />);
  const empty = screen.getByText('Nenhum convênio.');
  expect(empty).not.toBeVisible();

  await user.click(screen.getByRole('heading', { name: 'Pagadores' }));
  expect(empty).toBeVisible();
});
