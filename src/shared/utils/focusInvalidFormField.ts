import type { FormEvent } from 'react';

const pendingForms = new WeakSet<HTMLFormElement>();

export function focusInvalidFormField(field: HTMLElement) {
  field.focus({ preventScroll: true });
  field.scrollIntoView?.({
    behavior: 'auto',
    block: 'center',
    inline: 'nearest',
  });
}

export function focusFirstInvalidFormField(event: FormEvent<HTMLFormElement>) {
  const form = event.currentTarget;
  if (pendingForms.has(form)) return;

  pendingForms.add(form);
  window.setTimeout(() => {
    pendingForms.delete(form);
    if (!form.isConnected) return;

    const invalidField = form.querySelector<HTMLElement>('input:invalid, select:invalid, textarea:invalid');
    if (!invalidField) return;

    focusInvalidFormField(invalidField);
  }, 0);
}
