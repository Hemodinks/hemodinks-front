import { CircleCheck, CircleX, X } from 'lucide-react';
import type { User } from '../../types';
import { CopyValue } from '../../shared/components/CopyValue';
import { Modal } from '../../shared/components/Modal';
import {
  formatCpfInput,
  formatPhoneInput,
  getProfileName,
  isMedicalProfileUser,
  toDisplayDate,
} from '../../shared/utils/formatters';

type InfoModalProps = {
  user: User;
  onClose: () => void;
};

export function InfoModal({ user, onClose }: InfoModalProps) {
  const formattedCpf = formatCpfInput(user.cpf || '');

  return (
    <Modal titleId="info-title" className="info-modal" onClose={onClose}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">Informacoes</span>
            <h2 id="info-title">{user.nome}</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar" aria-label="Fechar informacoes do usuario">
            <X size={18} />
          </button>
        </div>

        <dl className="info-list">
          <div>
            <dt>Perfil</dt>
            <dd>{user.perfilNome || getProfileName(user.perfilId)}</dd>
          </div>
          <div>
            <dt>CPF</dt>
            <dd><CopyValue label="CPF" value={formattedCpf} /></dd>
          </div>
          {isMedicalProfileUser(user) && (
            <>
              <div>
                <dt>CRM</dt>
                <dd><CopyValue label="CRM" value={user.crm || '-'} /></dd>
              </div>
              <div>
                <dt>UF do CRM</dt>
                <dd>{user.crmUf || '-'}</dd>
              </div>
            </>
          )}
          <div>
            <dt>Data de nascimento</dt>
            <dd>{toDisplayDate(user.dataNascimento)}</dd>
          </div>
          <div>
            <dt>Troca de senha</dt>
            <dd>{user.precisaTrocarSenha ? 'Senha inicial' : 'Senha alterada'}</dd>
          </div>
          <div>
            <dt>Situacao</dt>
            <dd className={user.ativo ? 'detail-active' : 'detail-inactive'}>
              {user.ativo ? <CircleCheck size={17} /> : <CircleX size={17} />}
              {user.ativo ? 'Ativo' : 'Inativo'}
            </dd>
          </div>
        </dl>
      </Modal>
  );
}

type ContactModalProps = {
  user: User;
  onClose: () => void;
};

export function ContactModal({ user, onClose }: ContactModalProps) {
  const formattedPhone = formatPhoneInput(user.telefone || '');

  return (
    <Modal titleId="contact-title" className="info-modal contact-modal" onClose={onClose}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">Contato</span>
            <h2 id="contact-title">{user.nome}</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar" aria-label="Fechar contato do usuario">
            <X size={18} />
          </button>
        </div>

        <dl className="info-list">
          <div>
            <dt>Email</dt>
            <dd><CopyValue label="email" value={user.email} /></dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd><CopyValue label="telefone" value={formattedPhone} /></dd>
          </div>
        </dl>
      </Modal>
  );
}
