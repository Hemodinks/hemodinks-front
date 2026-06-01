import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Info,
  ImagePlus,
  KeyRound,
  LogIn,
  LogOut,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sun,
  Trash2,
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
const THEME_KEY = 'hemodinks.theme';
const DEFAULT_PASSWORD = 'Senha@123';
const PAGE_SIZE = 10;
const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;
const MAX_PHONE_LENGTH = 20;
const MAX_PASSWORD_LENGTH = 500;
const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;
const DEFAULT_PROFILE_ID = 2;

const ALLOWED_PROFILE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const PROFILE_OPTIONS = [
  { id: 1, nome: 'Administrador' },
  { id: 2, nome: 'Médicos' },
  { id: 3, nome: 'Pacientes' },
] as const;

const VALID_BRAZIL_AREA_CODES = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

const emptyUserForm: UserFormData = {
  nome: '',
  email: '',
  telefone: '+55 ',
  fotoPerfil: null,
  dataNascimento: '',
  ativo: true,
  perfilId: DEFAULT_PROFILE_ID,
};

type Theme = 'light' | 'dark';

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

function loadStoredTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado.';
}

function isValidProfileId(perfilId: number) {
  return PROFILE_OPTIONS.some((profile) => profile.id === perfilId);
}

function getProfileName(perfilId: number) {
  return PROFILE_OPTIONS.find((profile) => profile.id === perfilId)?.nome ?? 'Médicos';
}

function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return 'US';
  }

  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function getLocalBrazilPhoneDigits(value: string) {
  const digits = onlyDigits(value);
  const localDigits = digits.startsWith('55') ? digits.slice(2) : digits;
  return localDigits.slice(0, 11);
}

function formatPhoneInput(value: string) {
  const localDigits = getLocalBrazilPhoneDigits(value);
  const ddd = localDigits.slice(0, 2);
  const firstPart = localDigits.slice(2, 7);
  const secondPart = localDigits.slice(7, 11);

  if (!localDigits) {
    return '+55 ';
  }

  if (localDigits.length <= 2) {
    return `+55 (${ddd}`;
  }

  if (localDigits.length <= 7) {
    return `+55 (${ddd}) ${firstPart}`;
  }

  return `+55 (${ddd}) ${firstPart}-${secondPart}`;
}

function normalizePhoneForPayload(value: string) {
  return `+55${getLocalBrazilPhoneDigits(value)}`;
}

function isValidBrazilMobilePhone(value: string) {
  const localDigits = getLocalBrazilPhoneDigits(value);
  const areaCode = localDigits.slice(0, 2);
  const number = localDigits.slice(2);

  return localDigits.length === 11
    && VALID_BRAZIL_AREA_CODES.has(areaCode)
    && number.startsWith('9')
    && !/^(\d)\1{10}$/.test(localDigits);
}

function isValidEmail(value: string) {
  const email = value.trim();
  return email.length <= MAX_EMAIL_LENGTH
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function readProfilePhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Nao foi possivel carregar a foto.'));
    };

    reader.onerror = () => reject(new Error('Nao foi possivel carregar a foto.'));
    reader.readAsDataURL(file);
  });
}

function formatDateInput(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) {
    return day;
  }

  if (digits.length <= 4) {
    return `${day}/${month}`;
  }

  return `${day}/${month}/${year}`;
}

function toDisplayDate(value: string) {
  if (!value) {
    return '';
  }

  if (value.includes('/')) {
    return formatDateInput(value);
  }

  const [year, month, day] = value.split('T')[0].split('-');

  if (!year || !month || !day) {
    return '';
  }

  return `${day}/${month}/${year}`;
}

function parseDisplayDate(value: string) {
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
}

function isValidBirthDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return false;
  }

  const [dayText, monthText, yearText] = value.split('/');
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return year >= 1900
    && date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date <= today;
}

function getPasswordStrength(password: string) {
  if (!password || password === DEFAULT_PASSWORD) {
    return { score: 0, label: 'Muito fraca' };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ['Muito fraca', 'Fraca', 'Regular', 'Boa', 'Forte', 'Muito forte'];
  return { score, label: labels[score] };
}

function validateUserForm(data: UserFormData) {
  if (!data.nome.trim()) {
    return 'Informe o nome completo.';
  }

  if (data.nome.trim().length > MAX_NAME_LENGTH) {
    return `O nome deve ter no maximo ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (!isValidEmail(data.email)) {
    return 'Informe um email valido.';
  }

  if (!isValidBrazilMobilePhone(data.telefone)) {
    return 'Informe um celular valido com DDD e 9 digitos.';
  }

  if (!isValidBirthDate(data.dataNascimento)) {
    return 'Informe a data de nascimento no formato dd/mm/yyyy.';
  }

  if (!isValidProfileId(data.perfilId)) {
    return 'Selecione um perfil valido.';
  }

  return '';
}

function toUserPayload(data: UserFormData): UserFormData {
  return {
    nome: data.nome.trim(),
    email: data.email.trim(),
    telefone: normalizePhoneForPayload(data.telefone),
    fotoPerfil: data.fotoPerfil || null,
    dataNascimento: parseDisplayDate(data.dataNascimento),
    ativo: data.ativo,
    perfilId: data.perfilId,
  };
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const [theme, setTheme] = useState<Theme>(() => loadStoredTheme());
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState<UserFormData>(emptyUserForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedInfoUser, setSelectedInfoUser] = useState<User | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => current === 'light' ? 'dark' : 'light');
  };

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
      || (user.perfilNome || getProfileName(user.perfilId)).toLowerCase().includes(term)
      || user.telefone.toLowerCase().includes(term)
      || formatPhoneInput(user.telefone).toLowerCase().includes(term)
    ));
  }, [searchTerm, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(pageStart, pageEnd);
  const visibleStart = filteredUsers.length ? pageStart + 1 : 0;
  const visibleEnd = Math.min(pageEnd, filteredUsers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido.');
      return;
    }

    setLoginLoading(true);

    try {
      const result = await authenticate(loginEmail.trim(), loginPassword);
      persistSession({
        token: result.token,
        user: {
          id: result.id,
          nome: result.nome,
          email: result.email,
          fotoPerfil: result.fotoPerfil ?? null,
          precisaTrocarSenha: result.precisaTrocarSenha,
          perfilId: result.perfilId || DEFAULT_PROFILE_ID,
          perfilNome: result.perfilNome || getProfileName(result.perfilId || DEFAULT_PROFILE_ID),
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
    setPhotoInputKey((key) => key + 1);
  };

  const handleEditUser = (user: User) => {
    setEditingId(user.id);
    setFormError('');
    setSuccessMessage('');
    setFormData({
      nome: user.nome,
      email: user.email,
      telefone: formatPhoneInput(user.telefone),
      fotoPerfil: user.fotoPerfil ?? null,
      dataNascimento: toDisplayDate(user.dataNascimento),
      ativo: user.ativo,
      perfilId: user.perfilId || DEFAULT_PROFILE_ID,
    });
    setPhotoInputKey((key) => key + 1);
  };

  const handleProfilePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
      setFormError('Use uma foto PNG, JPG ou WEBP.');
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setFormError('A foto deve ter no maximo 1 MB.');
      return;
    }

    try {
      const fotoPerfil = await readProfilePhoto(file);
      setFormData((current) => ({ ...current, fotoPerfil }));
      setFormError('');
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleRemoveProfilePhoto = () => {
    setFormData((current) => ({ ...current, fotoPerfil: null }));
    setPhotoInputKey((key) => key + 1);
  };

  const handleSubmitUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    const validationError = validateUserForm(formData);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = toUserPayload(formData);

    setFormLoading(true);
    setFormError('');
    setSuccessMessage('');

    try {
      let savedUser: User;

      if (editingId) {
        savedUser = await updateUser(editingId, payload, session.token);
        setSuccessMessage('Usuario atualizado.');
      } else {
        savedUser = await createUser(payload, session.token);
        setSuccessMessage(`Usuario cadastrado com senha inicial ${DEFAULT_PASSWORD}.`);
      }

      if (editingId && savedUser.id === session.user.id) {
        persistSession({
          ...session,
          user: {
            ...session.user,
            nome: savedUser.nome,
            email: savedUser.email,
            fotoPerfil: savedUser.fotoPerfil ?? null,
            perfilId: savedUser.perfilId || DEFAULT_PROFILE_ID,
            perfilNome: savedUser.perfilNome || getProfileName(savedUser.perfilId || DEFAULT_PROFILE_ID),
          },
        });
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
        <TechCredit />
        <ThemeToggle theme={theme} onToggle={toggleTheme} floating />
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
                onChange={(event) => setLoginEmail(event.target.value.slice(0, MAX_EMAIL_LENGTH))}
                autoComplete="email"
                maxLength={MAX_EMAIL_LENGTH}
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
                maxLength={MAX_PASSWORD_LENGTH}
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
        <TechCredit />
        <ThemeToggle theme={theme} onToggle={toggleTheme} floating />
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
      <TechCredit />
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
            <UserAvatar name={session.user.nome} photo={session.user.fotoPerfil} size="sm" />
            <span>{session.user.nome}</span>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
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
                onChange={(event) => setFormData((current) => ({ ...current, nome: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
                maxLength={MAX_NAME_LENGTH}
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value.slice(0, MAX_EMAIL_LENGTH) }))}
                maxLength={MAX_EMAIL_LENGTH}
                required
              />
            </label>

            <label>
              Telefone
              <input
                type="tel"
                value={formData.telefone}
                onFocus={() => setFormData((current) => ({ ...current, telefone: formatPhoneInput(current.telefone) }))}
                onChange={(event) => setFormData((current) => ({ ...current, telefone: formatPhoneInput(event.target.value) }))}
                inputMode="numeric"
                maxLength={MAX_PHONE_LENGTH}
                placeholder="+55 (81) 99999-9999"
                required
              />
            </label>

            <label>
              Data de nascimento
              <input
                type="text"
                value={formData.dataNascimento}
                onChange={(event) => setFormData((current) => ({ ...current, dataNascimento: formatDateInput(event.target.value) }))}
                inputMode="numeric"
                maxLength={10}
                placeholder="dd/mm/yyyy"
                required
              />
            </label>

            <label>
              Perfil
              <select
                value={formData.perfilId}
                onChange={(event) => setFormData((current) => ({ ...current, perfilId: Number(event.target.value) }))}
                required
              >
                {PROFILE_OPTIONS.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.nome}
                  </option>
                ))}
              </select>
            </label>

            <div className="profile-photo-field">
              <label className="field-label" htmlFor="profile-photo-input">
                Foto do perfil
              </label>
              <div className="photo-uploader">
                <UserAvatar name={formData.nome || 'Usuario'} photo={formData.fotoPerfil} size="lg" />
                <div className="photo-actions">
                  <label className="ghost-button file-action" htmlFor="profile-photo-input">
                    <ImagePlus size={17} />
                    {formData.fotoPerfil ? 'Trocar foto' : 'Adicionar foto'}
                  </label>
                  {formData.fotoPerfil && (
                    <button type="button" className="ghost-button danger-text" onClick={handleRemoveProfilePhoto}>
                      <Trash2 size={17} />
                      Remover
                    </button>
                  )}
                </div>
              </div>
              <input
                key={photoInputKey}
                id="profile-photo-input"
                className="sr-only"
                type="file"
                aria-label="Foto do perfil"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void handleProfilePhotoChange(event)}
              />
              <span className="file-hint">PNG, JPG ou WEBP ate 1 MB.</span>
            </div>

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
                  <th>Perfil</th>
                  <th>Info</th>
                  <th aria-label="Acoes" />
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={6} className="empty-row">Carregando usuarios...</td>
                  </tr>
                ) : paginatedUsers.length ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="name-cell">
                          <UserAvatar name={user.nome} photo={user.fotoPerfil} size="sm" />
                          <span>{user.nome}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{formatPhoneInput(user.telefone)}</td>
                      <td>{user.perfilNome || getProfileName(user.perfilId)}</td>
                      <td>
                        <button
                          type="button"
                          className={`status-info-button ${user.ativo ? 'active' : 'inactive'}`}
                          title={`${user.ativo ? 'Ativo' : 'Inativo'} - clique para ver detalhes`}
                          aria-label={`Detalhes de ${user.nome}`}
                          onClick={() => setSelectedInfoUser(user)}
                        >
                          {user.ativo ? <CircleCheck size={19} /> : <CircleX size={19} />}
                          <Info size={15} />
                        </button>
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
                    <td colSpan={6} className="empty-row">Nenhum usuario encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span>
              {visibleStart}-{visibleEnd} de {filteredUsers.length}
            </span>
            <div className="pagination-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                title="Pagina anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="page-indicator">Pagina {currentPage} de {totalPages}</span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                title="Proxima pagina"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>
      </section>

      {selectedInfoUser && (
        <InfoModal user={selectedInfoUser} onClose={() => setSelectedInfoUser(null)} />
      )}

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

function TechCredit() {
  return <div className="tech-credit">GM Tech Solutions</div>;
}

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
  floating?: boolean;
};

function ThemeToggle({ theme, onToggle, floating = false }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`ghost-button theme-toggle ${floating ? 'floating' : ''}`}
      onClick={onToggle}
      title={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      {isDark ? 'Tema claro' : 'Tema escuro'}
    </button>
  );
}

type UserAvatarProps = {
  name: string;
  photo?: string | null;
  size?: 'sm' | 'lg';
};

function UserAvatar({ name, photo, size = 'sm' }: UserAvatarProps) {
  if (photo) {
    return <img className={`user-avatar ${size}`} src={photo} alt={`Foto de ${name}`} />;
  }

  return (
    <span className={`user-avatar fallback ${size}`} aria-label={`Sem foto de ${name}`} title={name}>
      {getUserInitials(name)}
    </span>
  );
}

type InfoModalProps = {
  user: User;
  onClose: () => void;
};

function InfoModal({ user, onClose }: InfoModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel info-modal" role="dialog" aria-modal="true" aria-labelledby="info-title">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Informacoes</span>
            <h2 id="info-title">{user.nome}</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        <dl className="info-list">
          <div>
            <dt>Perfil</dt>
            <dd>{user.perfilNome || getProfileName(user.perfilId)}</dd>
          </div>
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
      </section>
    </div>
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
  const passwordStrength = useMemo(() => getPasswordStrength(novaSenha), [novaSenha]);

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
          maxLength={MAX_PASSWORD_LENGTH}
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
          maxLength={MAX_PASSWORD_LENGTH}
          required
        />
      </label>

      <div className={`password-strength strength-${passwordStrength.score}`} aria-live="polite">
        <div className="strength-track">
          <span style={{ width: `${Math.max(1, passwordStrength.score) * 20}%` }} />
        </div>
        <span>Forca da senha: {passwordStrength.label}</span>
      </div>

      <label>
        Confirmar nova senha
        <input
          type="password"
          value={confirmacao}
          onChange={(event) => setConfirmacao(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          maxLength={MAX_PASSWORD_LENGTH}
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
