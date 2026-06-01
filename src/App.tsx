import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  authenticate,
  changePassword,
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from './api';
import type { AuthSession, User, UserFormData } from './types';
import brandImage from '../imagem candidata hemodinks.jpg';

const SESSION_KEY = 'hemodinks.session';
const DEFAULT_PASSWORD = 'Senha@123';

const emptyUserForm: UserFormData = {
  nome: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  ativo: true,
};

function loadStoredSession(): AuthSession | null {
  const rawSession = localStorage.getItem(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado.';
}

function toDateInput(value: string) {
  return value ? value.split('T')[0] : '';
}

function formatDate(value: string) {
  const date = toDateInput(value);

  if (!date) {
    return '-';
  }

  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<UserFormData>(emptyUserForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const persistSession = (nextSession: AuthSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setUsers([]);
    setLoginPassword('');
  };

  const loadUsers = async (token = session?.token) => {
    if (!token) {
      return;
    }

    setUsersLoading(true);
    setUsersError('');

    try {
      const result = await getUsers(token);
      setUsers(result);
    } catch (error) {
      setUsersError(getErrorMessage(error));
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha) {
      void loadUsers(session.token);
    }
  }, [session?.token, session?.user.precisaTrocarSenha]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) => (
      user.nome.toLowerCase().includes(term)
      || user.email.toLowerCase().includes(term)
      || user.telefone.toLowerCase().includes(term)
    ));
  }, [searchTerm, users]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await authenticate(loginEmail, loginPassword);
      persistSession({
        token: result.token,
        user: {
          id: result.id,
          nome: result.nome,
          email: result.email,
          precisaTrocarSenha: result.precisaTrocarSenha,
        },
      });
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const resetUserForm = () => {
    setFormData(emptyUserForm);
    setEditingId(null);
    setFormError('');
  };

  const handleEditUser = (user: User) => {
    setEditingId(user.id);
    setFormError('');
    setSuccessMessage('');
    setFormData({
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      dataNascimento: toDateInput(user.dataNascimento),
      ativo: user.ativo,
    });
  };

  const handleSubmitUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    setFormLoading(true);
    setFormError('');
    setSuccessMessage('');

    try {
      if (editingId) {
        await updateUser(editingId, formData, session.token);
        setSuccessMessage('Usuario atualizado.');
      } else {
        await createUser(formData, session.token);
        setSuccessMessage(`Usuario cadastrado com senha inicial ${DEFAULT_PASSWORD}.`);
      }

      resetUserForm();
      await loadUsers(session.token);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!session || !window.confirm(`Excluir ${user.nome}?`)) {
      return;
    }

    setUsersError('');
    setSuccessMessage('');

    try {
      await deleteUser(user.id, session.token);

      if (user.id === session.user.id) {
        logout();
        return;
      }

      setSuccessMessage('Usuario excluido.');
      await loadUsers(session.token);
    } catch (error) {
      setUsersError(getErrorMessage(error));
    }
  };

  const handlePasswordChanged = (message: string) => {
    if (!session) {
      return;
    }

    const nextSession = {
      ...session,
      user: {
        ...session.user,
        precisaTrocarSenha: false,
      },
    };

    persistSession(nextSession);
    setShowPasswordModal(false);
    setSuccessMessage(message);
  };

  if (!session) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <div className="brand-block">
            <img src={brandImage} alt="Hemodinks" className="brand-mark" />
            <div>
              <span className="eyebrow">Hemodinks</span>
              <h1>Acesso ao sistema</h1>
            </div>
          </div>

          <form className="stack" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {loginError && <p className="alert error">{loginError}</p>}

            <button className="primary-action" type="submit" disabled={loginLoading}>
              <LogIn size={18} />
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (session.user.precisaTrocarSenha) {
    return (
      <main className="auth-screen compact">
        <section className="auth-panel password-required">
          <div className="brand-block">
            <KeyRound size={36} strokeWidth={1.8} />
            <div>
              <span className="eyebrow">Primeiro acesso</span>
              <h1>Troque sua senha</h1>
            </div>
          </div>

          <PasswordForm
            session={session}
            forced
            onChanged={handlePasswordChanged}
            onCancel={logout}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <img src={brandImage} alt="Hemodinks" className="topbar-logo" />
          <div>
            <span className="eyebrow">Hemodinks</span>
            <h1>Usuarios</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="current-user">
            <UserRound size={18} />
            <span>{session.user.nome}</span>
          </div>
          <button type="button" className="ghost-button" onClick={() => setShowPasswordModal(true)}>
            <KeyRound size={17} />
            Mudar senha
          </button>
          <button type="button" className="icon-button" onClick={logout} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="form-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{editingId ? 'Edicao' : 'Cadastro'}</span>
              <h2>{editingId ? 'Editar usuario' : 'Novo usuario'}</h2>
            </div>
            {editingId ? (
              <button type="button" className="icon-button muted" onClick={resetUserForm} title="Cancelar edicao">
                <X size={18} />
              </button>
            ) : (
              <span className="password-chip">Senha: {DEFAULT_PASSWORD}</span>
            )}
          </div>

          <form className="stack" onSubmit={handleSubmitUser}>
            <label>
              Nome completo
              <input
                type="text"
                value={formData.nome}
                onChange={(event) => setFormData((current) => ({ ...current, nome: event.target.value }))}
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>

            <label>
              Telefone
              <input
                type="tel"
                value={formData.telefone}
                onChange={(event) => setFormData((current) => ({ ...current, telefone: event.target.value }))}
                placeholder="+5581999999999"
                required
              />
            </label>

            <label>
              Data de nascimento
              <input
                type="date"
                value={formData.dataNascimento}
                onChange={(event) => setFormData((current) => ({ ...current, dataNascimento: event.target.value }))}
                required
              />
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(event) => setFormData((current) => ({ ...current, ativo: event.target.checked }))}
              />
              Usuario ativo
            </label>

            {formError && <p className="alert error">{formError}</p>}

            <button className="primary-action" type="submit" disabled={formLoading}>
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {formLoading ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Cadastrar usuario'}
            </button>
          </form>
        </aside>

        <section className="data-panel">
          <div className="data-header">
            <div>
              <span className="eyebrow">Base de usuarios</span>
              <h2>{users.length} cadastrados</h2>
            </div>

            <div className="table-tools">
              <label className="search-box">
                <Search size={17} />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar"
                />
              </label>
              <button type="button" className="icon-button" onClick={() => void loadUsers()} title="Atualizar lista">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {successMessage && <p className="alert success"><CheckCircle2 size={17} />{successMessage}</p>}
          {usersError && <p className="alert error">{usersError}</p>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Nascimento</th>
                  <th>Status</th>
                  <th>Senha</th>
                  <th aria-label="Acoes" />
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={7} className="empty-row">Carregando usuarios...</td>
                  </tr>
                ) : filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="name-cell">
                          <Users size={17} />
                          <span>{user.nome}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.telefone}</td>
                      <td>{formatDate(user.dataNascimento)}</td>
                      <td>
                        <span className={`status-pill ${user.ativo ? 'active' : 'inactive'}`}>
                          {user.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${user.precisaTrocarSenha ? 'warning' : 'ok'}`}>
                          {user.precisaTrocarSenha ? 'Inicial' : 'Alterada'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="icon-button muted" onClick={() => handleEditUser(user)} title="Editar">
                            <Pencil size={17} />
                          </button>
                          <button type="button" className="icon-button danger" onClick={() => void handleDeleteUser(user)} title="Excluir">
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="empty-row">Nenhum usuario encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {showPasswordModal && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="password-title">
            <div className="panel-title">
              <div>
                <span className="eyebrow">Seguranca</span>
                <h2 id="password-title">Mudar senha</h2>
              </div>
              <button type="button" className="icon-button muted" onClick={() => setShowPasswordModal(false)} title="Fechar">
                <X size={18} />
              </button>
            </div>
            <PasswordForm
              session={session}
              onChanged={handlePasswordChanged}
              onCancel={() => setShowPasswordModal(false)}
            />
          </section>
        </div>
      )}
    </main>
  );
}

type PasswordFormProps = {
  session: AuthSession;
  forced?: boolean;
  onChanged: (message: string) => void;
  onCancel?: () => void;
};

function PasswordForm({ session, forced = false, onChanged, onCancel }: PasswordFormProps) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (novaSenha !== confirmacao) {
      setError('A confirmacao precisa ser igual a nova senha.');
      return;
    }

    if (novaSenha === DEFAULT_PASSWORD) {
      setError('Escolha uma senha diferente da senha inicial.');
      return;
    }

    setLoading(true);

    try {
      const result = await changePassword(session.user.id, { senhaAtual, novaSenha }, session.token);
      onChanged(result.message);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {forced && (
        <p className="alert warning">
          A senha inicial {DEFAULT_PASSWORD} precisa ser alterada para liberar o acesso.
        </p>
      )}

      <label>
        Senha atual
        <input
          type="password"
          value={senhaAtual}
          onChange={(event) => setSenhaAtual(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      <label>
        Nova senha
        <input
          type="password"
          value={novaSenha}
          onChange={(event) => setNovaSenha(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      <label>
        Confirmar nova senha
        <input
          type="password"
          value={confirmacao}
          onChange={(event) => setConfirmacao(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {error && <p className="alert error">{error}</p>}

      <div className="button-row">
        {onCancel && (
          <button type="button" className="ghost-button" onClick={onCancel}>
            <X size={17} />
            {forced ? 'Sair' : 'Cancelar'}
          </button>
        )}
        <button className="primary-action" type="submit" disabled={loading}>
          <KeyRound size={18} />
          {loading ? 'Alterando...' : 'Alterar senha'}
        </button>
      </div>
    </form>
  );
}
