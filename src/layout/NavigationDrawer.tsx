import { type ReactNode, useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../shared/components/Modal';

// Hosts the same Sidebar used on desktop; Modal owns focus, Escape and backdrop dismissal.
export function NavigationDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const titleId = useId();
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 981px)');
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener('change', closeOnDesktop);
    closeOnDesktop();
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [onClose]);

  return <Modal titleId={titleId} onClose={onClose} className="navigation-drawer" backdropClassName="navigation-backdrop">
    <div className="navigation-drawer-heading">
      <h2 id={titleId}>Menu do sistema</h2>
      <button type="button" className="ghost-button" aria-label="Fechar menu" onClick={onClose}><X size={22} /></button>
    </div>
    <div onClick={(event) => {
      const button = (event.target as HTMLElement).closest('.side-nav button');
      if (button && !button.hasAttribute('aria-expanded')) onClose();
    }}>{children}</div>
  </Modal>;
}
