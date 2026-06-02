import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  CalendarDays,
  ClipboardList,
  FileText,
  FileUp,
  GripVertical,
  Info,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
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
  Users,
  X,
} from 'lucide-react';
import {
  authenticate,
  changePassword,
  createUser,
  createPaciente,
  deletePaciente,
  deletePacienteArquivo,
  deleteUser,
  getDashboardSummary,
  getPaciente,
  getPacientes,
  getUsers,
  updatePaciente,
  updateUser,
  uploadPacienteArquivo,
} from './api';
import type { AuthSession, DashboardSummary, Paciente, PacienteFormData, User, UserFormData } from './types';
import brandImage from '../imagem candidata hemodinks.jpg';

const SESSION_KEY = 'hemodinks.session';
const THEME_KEY = 'hemodinks.theme';
const DEFAULT_PASSWORD = 'Senha@123';
const PAGE_SIZE = 10;
const LOOKUP_PAGE_SIZE = 100;
const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;
const MAX_PHONE_LENGTH = 20;
const MAX_CPF_LENGTH = 14;
const MAX_PASSWORD_LENGTH = 500;
const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;
const MAX_PATIENT_FILE_BYTES = 10 * 1024 * 1024;
const MEDICAL_PROFILE_ID = 2;
const DEFAULT_PROFILE_ID = MEDICAL_PROFILE_ID;

const ALLOWED_PROFILE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_PATIENT_FILE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

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
  cpf: '',
  fotoPerfil: null,
  dataNascimento: '',
  ativo: true,
  perfilId: DEFAULT_PROFILE_ID,
};

const emptyPacienteForm: PacienteFormData = {
  data: '',
  nomePaciente: '',
  cpf: '',
  email: '',
  telefone: '+55 ',
  fotoPerfil: null,
  dataNascimento: '',
  hospital: '',
  medico: '',
  convenio: '',
  procedimento: '',
  autorizacao: '',
  pagamento: '',
  repasseGlosa: '',
  statusPago: false,
  ativo: true,
};

type Theme = 'light' | 'dark';
type AppView = 'dashboard' | 'users' | 'patients';
type ModuleMode = 'list' | 'form';
type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
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

function isMedicalProfileUser(user: User) {
  const profileName = (user.perfilNome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return user.perfilId === MEDICAL_PROFILE_ID || profileName.includes('medico');
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

function formatCpfInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);

  if (digits.length <= 3) {
    return part1;
  }

  if (digits.length <= 6) {
    return `${part1}.${part2}`;
  }

  if (digits.length <= 9) {
    return `${part1}.${part2}.${part3}`;
  }

  return `${part1}.${part2}.${part3}-${part4}`;
}

function normalizeCpfForPayload(value: string) {
  return onlyDigits(value).slice(0, 11);
}

function isValidCpf(value: string) {
  const cpf = normalizeCpfForPayload(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const getDigit = (length: number) => {
    let sum = 0;

    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return getDigit(9) === Number(cpf[9]) && getDigit(10) === Number(cpf[10]);
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

function toDatePickerValue(value: string) {
  return isValidBirthDate(value) ? parseDisplayDate(value) : '';
}

function fromDatePickerValue(value: string) {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return '';
  }

  return `${day}/${month}/${year}`;
}

function getTodayPickerValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

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

  if (!isValidCpf(data.cpf)) {
    return 'Informe um CPF valido.';
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
    cpf: normalizeCpfForPayload(data.cpf),
    fotoPerfil: data.fotoPerfil || null,
    dataNascimento: parseDisplayDate(data.dataNascimento),
    ativo: data.ativo,
    perfilId: data.perfilId,
  };
}

function validatePacienteForm(data: PacienteFormData) {
  if (!data.nomePaciente.trim()) {
    return 'Informe o nome do paciente.';
  }

  if (!isValidCpf(data.cpf)) {
    return 'Informe um CPF valido.';
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

  return '';
}

function toPacientePayload(data: PacienteFormData): PacienteFormData {
  return {
    data: data.data && isValidBirthDate(data.data) ? parseDisplayDate(data.data) : null,
    nomePaciente: data.nomePaciente.trim(),
    cpf: normalizeCpfForPayload(data.cpf),
    email: data.email.trim(),
    telefone: normalizePhoneForPayload(data.telefone),
    fotoPerfil: data.fotoPerfil || null,
    dataNascimento: parseDisplayDate(data.dataNascimento),
    hospital: data.hospital.trim(),
    medico: data.medico.trim(),
    convenio: data.convenio.trim(),
    procedimento: data.procedimento.trim(),
    autorizacao: data.autorizacao.trim(),
    pagamento: data.pagamento.trim(),
    repasseGlosa: data.repasseGlosa.trim(),
    statusPago: data.statusPago,
    ativo: data.ativo,
  };
}

function getPagedItems<T>(result: { items: T[] } | T[]) {
  return Array.isArray(result) ? result : result.items;
}

function getPagedTotal<T>(result: { totalItems: number } | T[]) {
  return Array.isArray(result) ? result.length : result.totalItems;
}

function getPagedTotalPages<T>(result: { totalPages: number } | T[]) {
  return Array.isArray(result) ? Math.max(1, Math.ceil(result.length / PAGE_SIZE)) : result.totalPages;
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const [theme, setTheme] = useState<Theme>(() => loadStoredTheme());
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [moduleMode, setModuleMode] = useState<ModuleMode>('list');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginInfo, setLoginInfo] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [dashboardError, setDashboardError] = useState('');

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersTotalItems, setUsersTotalItems] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [medicalUsers, setMedicalUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState<UserFormData>(emptyUserForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedInfoUser, setSelectedInfoUser] = useState<User | null>(null);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacientesLoading, setPacientesLoading] = useState(false);
  const [pacientesError, setPacientesError] = useState('');
  const [pacienteSuccessMessage, setPacienteSuccessMessage] = useState('');
  const [pacienteSearchTerm, setPacienteSearchTerm] = useState('');
  const [debouncedPacienteSearchTerm, setDebouncedPacienteSearchTerm] = useState('');
  const [pacienteCurrentPage, setPacienteCurrentPage] = useState(1);
  const [pacientesTotalItems, setPacientesTotalItems] = useState(0);
  const [pacientesTotalPages, setPacientesTotalPages] = useState(1);
  const [pacienteFormData, setPacienteFormData] = useState<PacienteFormData>(emptyPacienteForm);
  const [editingPacienteId, setEditingPacienteId] = useState<number | null>(null);
  const [editingPacienteDetails, setEditingPacienteDetails] = useState<Paciente | null>(null);
  const [pacienteFormLoading, setPacienteFormLoading] = useState(false);
  const [pacienteFormError, setPacienteFormError] = useState('');
  const [patientPhotoInputKey, setPatientPhotoInputKey] = useState(0);
  const [patientFileInputKey, setPatientFileInputKey] = useState(0);
  const [pendingPatientFiles, setPendingPatientFiles] = useState<File[]>([]);

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

  const isBusy = loginLoading || usersLoading || formLoading || pacientesLoading || pacienteFormLoading;

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setDashboardSummary(null);
    setUsers([]);
    setUsersTotalItems(0);
    setUsersTotalPages(1);
    setMedicalUsers([]);
    setPacientes([]);
    setPacientesTotalItems(0);
    setPacientesTotalPages(1);
    setActiveView('dashboard');
    setModuleMode('list');
    setLoginPassword('');
  };

  const loadDashboardSummary = async (token = session?.token) => {
    if (!token) {
      return;
    }

    setDashboardError('');

    try {
      const result = await getDashboardSummary(token);
      setDashboardSummary(result);
    } catch (error) {
      setDashboardError(getErrorMessage(error));
    }
  };

  const loadUsers = async (
    token = session?.token,
    page = currentPage,
    search = debouncedSearchTerm,
  ) => {
    if (!token) {
      return;
    }

    setUsersLoading(true);
    setUsersError('');

    try {
      const result = await getUsers(token, {
        page,
        pageSize: PAGE_SIZE,
        search,
      });
      setUsers(getPagedItems(result));
      setUsersTotalItems(getPagedTotal(result));
      setUsersTotalPages(getPagedTotalPages(result));
    } catch (error) {
      setUsersError(getErrorMessage(error));
    } finally {
      setUsersLoading(false);
    }
  };

  const loadMedicalUsers = async (token = session?.token) => {
    if (!token) {
      return;
    }

    try {
      const result = await getUsers(token, {
        page: 1,
        pageSize: LOOKUP_PAGE_SIZE,
        profileId: MEDICAL_PROFILE_ID,
      });
      setMedicalUsers(getPagedItems(result));
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
  };

  const loadPacientes = async (
    token = session?.token,
    page = pacienteCurrentPage,
    search = debouncedPacienteSearchTerm,
  ) => {
    if (!token) {
      return;
    }

    setPacientesLoading(true);
    setPacientesError('');

    try {
      const result = await getPacientes(token, {
        page,
        pageSize: PAGE_SIZE,
        search,
      });
      setPacientes(getPagedItems(result));
      setPacientesTotalItems(getPagedTotal(result));
      setPacientesTotalPages(getPagedTotalPages(result));
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    } finally {
      setPacientesLoading(false);
    }
  };

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha) {
      void loadDashboardSummary(session.token);
    }
  }, [session?.token, session?.user.precisaTrocarSenha]);

  const totalPages = Math.max(1, usersTotalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const paginatedUsers = users;
  const visibleStart = usersTotalItems ? pageStart + 1 : 0;
  const visibleEnd = Math.min(pageEnd, usersTotalItems);
  const pacienteTotalPages = Math.max(1, pacientesTotalPages);
  const pacientePageStart = (pacienteCurrentPage - 1) * PAGE_SIZE;
  const pacientePageEnd = pacientePageStart + PAGE_SIZE;
  const paginatedPacientes = pacientes;
  const pacienteVisibleStart = pacientesTotalItems ? pacientePageStart + 1 : 0;
  const pacienteVisibleEnd = Math.min(pacientePageEnd, pacientesTotalItems);
  const activeUsersCount = dashboardSummary?.activeUsersCount ?? 0;
  const activePatientsCount = dashboardSummary?.activePatientsCount ?? 0;
  const pendingPaymentsCount = dashboardSummary?.pendingPaymentsCount ?? 0;
  const patientFilesCount = dashboardSummary?.patientFilesCount ?? 0;
  const usersCount = dashboardSummary?.usersCount ?? usersTotalItems;
  const pacientesCount = dashboardSummary?.pacientesCount ?? pacientesTotalItems;
  const editingPaciente = useMemo(
    () => editingPacienteDetails ?? pacientes.find((paciente) => paciente.id === editingPacienteId) ?? null,
    [editingPacienteDetails, editingPacienteId, pacientes],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPacienteCurrentPage(1);
      setDebouncedPacienteSearchTerm(pacienteSearchTerm);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [pacienteSearchTerm]);

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha && activeView === 'users' && moduleMode === 'list') {
      void loadUsers(session.token, currentPage, debouncedSearchTerm);
    }
  }, [session?.token, session?.user.precisaTrocarSenha, activeView, moduleMode, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha && activeView === 'patients') {
      if (moduleMode === 'list') {
        void loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm);
      }

      void loadMedicalUsers(session.token);
    }
  }, [session?.token, session?.user.precisaTrocarSenha, activeView, moduleMode, pacienteCurrentPage, debouncedPacienteSearchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (pacienteCurrentPage > pacienteTotalPages) {
      setPacienteCurrentPage(pacienteTotalPages);
    }
  }, [pacienteCurrentPage, pacienteTotalPages]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setLoginInfo('');

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
          cpf: result.cpf ?? null,
          fotoPerfil: result.fotoPerfil ?? null,
          precisaTrocarSenha: result.precisaTrocarSenha ?? loginPassword === DEFAULT_PASSWORD,
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

  const handleResetPassword = () => {
    setLoginError('');
    setLoginInfo('');

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido para resetar a senha.');
      return;
    }

    setLoginPassword(DEFAULT_PASSWORD);
    setLoginInfo(`Senha redefinida para ${DEFAULT_PASSWORD}. Use-a para entrar e altere a seguir.`);
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
    setActiveView('users');
    setModuleMode('form');
    setFormData({
      nome: user.nome,
      email: user.email,
      telefone: formatPhoneInput(user.telefone),
      cpf: formatCpfInput(user.cpf || ''),
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

  const resetPacienteForm = () => {
    setPacienteFormData(emptyPacienteForm);
    setEditingPacienteId(null);
    setEditingPacienteDetails(null);
    setPacienteFormError('');
    setPendingPatientFiles([]);
    setPatientPhotoInputKey((key) => key + 1);
    setPatientFileInputKey((key) => key + 1);
  };

  const handleEditPaciente = async (paciente: Paciente) => {
    if (!session) {
      return;
    }

    setEditingPacienteId(paciente.id);
    setEditingPacienteDetails(paciente);
    setPacienteFormError('');
    setPacienteSuccessMessage('');
    setActiveView('patients');
    setModuleMode('form');
    setPendingPatientFiles([]);
    setPacienteFormData({
      data: toDisplayDate(paciente.data || ''),
      nomePaciente: paciente.nomePaciente,
      cpf: formatCpfInput(paciente.cpf || ''),
      email: paciente.email,
      telefone: formatPhoneInput(paciente.telefone),
      fotoPerfil: paciente.fotoPerfil ?? null,
      dataNascimento: toDisplayDate(paciente.dataNascimento),
      hospital: paciente.hospital || '',
      medico: paciente.medico || '',
      convenio: paciente.convenio || '',
      procedimento: paciente.procedimento || '',
      autorizacao: paciente.autorizacao || '',
      pagamento: paciente.pagamento || '',
      repasseGlosa: paciente.repasseGlosa || '',
      statusPago: paciente.statusPago,
      ativo: paciente.ativo,
    });
    setPatientPhotoInputKey((key) => key + 1);
    setPatientFileInputKey((key) => key + 1);

    try {
      const details = await getPaciente(paciente.id, session.token);
      setEditingPacienteDetails(details);
    } catch (error) {
      setPacienteFormError(getErrorMessage(error));
    }
  };

  const handlePacientePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
      setPacienteFormError('Use uma foto PNG, JPG ou WEBP.');
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setPacienteFormError('A foto deve ter no maximo 1 MB.');
      return;
    }

    try {
      const fotoPerfil = await readProfilePhoto(file);
      setPacienteFormData((current) => ({ ...current, fotoPerfil }));
      setPacienteFormError('');
    } catch (error) {
      setPacienteFormError(getErrorMessage(error));
    }
  };

  const handlePacienteFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!files.length) {
      return;
    }

    const invalidFile = files.find((file) => !ALLOWED_PATIENT_FILE_TYPES.has(file.type) || file.size > MAX_PATIENT_FILE_BYTES);

    if (invalidFile) {
      setPacienteFormError('Use PDF, DOC, DOCX, JPG, JPEG, PNG, XLS ou XLSX de ate 10 MB.');
      return;
    }

    setPendingPatientFiles((current) => [...current, ...files]);
    setPacienteFormError('');
  };

  const removePendingPatientFile = (indexToRemove: number) => {
    setPendingPatientFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmitPaciente = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    const validationError = validatePacienteForm(pacienteFormData);

    if (validationError) {
      setPacienteFormError(validationError);
      return;
    }

    if (pacienteFormData.medico && !medicalUsers.some((user) => user.nome === pacienteFormData.medico)) {
      setPacienteFormError('Selecione um medico cadastrado com perfil Medicos.');
      return;
    }

    const payload = toPacientePayload(pacienteFormData);

    setPacienteFormLoading(true);
    setPacienteFormError('');
    setPacienteSuccessMessage('');

    try {
      const savedPaciente = editingPacienteId
        ? await updatePaciente(editingPacienteId, payload, session.token)
        : await createPaciente(payload, session.token);

      for (const file of pendingPatientFiles) {
        await uploadPacienteArquivo(savedPaciente.id, file, session.token);
      }

      setPacienteSuccessMessage(editingPacienteId ? 'Paciente atualizado.' : `Paciente cadastrado com senha inicial ${DEFAULT_PASSWORD}.`);
      resetPacienteForm();
      setModuleMode('list');
      await loadDashboardSummary(session.token);
    } catch (error) {
      setPacienteFormError(getErrorMessage(error));
    } finally {
      setPacienteFormLoading(false);
    }
  };

  const handleDeletePaciente = async (paciente: Paciente) => {
    if (!session || !window.confirm(`Excluir ${paciente.nomePaciente}?`)) {
      return;
    }

    setPacientesError('');
    setPacienteSuccessMessage('');

    try {
      await deletePaciente(paciente.id, session.token);
      setPacienteSuccessMessage('Paciente excluido.');
      await loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm);
      await loadDashboardSummary(session.token);
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
  };

  const handleDeletePacienteArquivo = async (paciente: Paciente, arquivoId: number) => {
    if (!session) {
      return;
    }

    setPacientesError('');

    try {
      await deletePacienteArquivo(paciente.id, arquivoId, session.token);
      const details = await getPaciente(paciente.id, session.token);
      setEditingPacienteDetails(details);
      await loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm);
      await loadDashboardSummary(session.token);
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
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
            cpf: savedUser.cpf ?? null,
            fotoPerfil: savedUser.fotoPerfil ?? null,
            perfilId: savedUser.perfilId || DEFAULT_PROFILE_ID,
            perfilNome: savedUser.perfilNome || getProfileName(savedUser.perfilId || DEFAULT_PROFILE_ID),
          },
        });
      }

      resetUserForm();
      setModuleMode('list');
      await loadDashboardSummary(session.token);
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
      await loadUsers(session.token, currentPage, debouncedSearchTerm);
      await loadDashboardSummary(session.token);
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

  const appTitle = activeView === 'dashboard'
    ? 'Painel inicial'
    : activeView === 'users' ? 'Usuarios' : 'Pacientes';

  const openDashboard = () => {
    setActiveView('dashboard');
    setModuleMode('list');
  };

  const openUsersList = () => {
    setActiveView('users');
    setModuleMode('list');
  };

  const openPatientsList = () => {
    setActiveView('patients');
    setModuleMode('list');
  };

  const openNewUserForm = () => {
    resetUserForm();
    setSuccessMessage('');
    setActiveView('users');
    setModuleMode('form');
  };

  const closeUserForm = () => {
    resetUserForm();
    setModuleMode('list');
  };

  const openNewPacienteForm = () => {
    resetPacienteForm();
    setPacienteSuccessMessage('');
    setActiveView('patients');
    setModuleMode('form');

    if (session) {
      void loadMedicalUsers(session.token);
    }
  };

  const closePacienteForm = () => {
    resetPacienteForm();
    setModuleMode('list');
  };

  if (!session) {
    return (
      <main className="auth-screen">
        <LoadingOverlay active={isBusy} />
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
            {loginInfo && <p className="alert success">{loginInfo}</p>}

            <div className="button-row">
              <button type="button" className="ghost-button" onClick={handleResetPassword}>
                Esqueci minha senha
              </button>
              <button className="primary-action" type="submit" disabled={loginLoading}>
                <LogIn size={18} />
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  if (session.user.precisaTrocarSenha) {
    return (
      <main className="auth-screen compact">
        <LoadingOverlay active={isBusy} />
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

  const currentUserProfile = session.user.perfilNome || getProfileName(session.user.perfilId);
  const formBreadcrumbLabel = activeView === 'users'
    ? editingId ? 'Editar usuario' : 'Novo usuario'
    : editingPacienteId ? 'Editar paciente' : 'Novo paciente';
  const activeModuleLabel = activeView === 'users' ? 'Usuarios' : 'Pacientes';
  const openActiveModuleList = activeView === 'users' ? openUsersList : openPatientsList;
  const breadcrumbItems: BreadcrumbItem[] = activeView === 'dashboard'
    ? [
      { label: 'Inicio', onClick: openDashboard },
      { label: 'Painel inicial' },
    ]
    : [
      { label: 'Inicio', onClick: openDashboard },
      {
        label: activeModuleLabel,
        onClick: moduleMode === 'form' ? openActiveModuleList : undefined,
      },
      ...(moduleMode === 'form' ? [{ label: formBreadcrumbLabel }] : []),
    ];

  return (
    <main className="app-shell">
      <LoadingOverlay active={isBusy} />
      <TechCredit />
      <header className="topbar">
        <div className="topbar-brand">
          <div>
            <span className="eyebrow">Hemodinks</span>
            <h1>{appTitle}</h1>
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        </div>

        <div className="topbar-right">
          <div className="current-user topbar-user" aria-label="Usuario logado">
            <UserAvatar name={session.user.nome} photo={session.user.fotoPerfil} size="sm" />
            <span className="current-user-name">{session.user.nome}</span>
          </div>

          <div className="topbar-actions">
            <div className="topbar-info-panel notification-chip" aria-label="Resumo rapido">
              <Bell size={17} />
              <span className="notification-label">Notificacoes</span>
              <span className="notification-count">{pendingPaymentsCount}</span>
            </div>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button type="button" className="ghost-button" onClick={() => setShowPasswordModal(true)}>
              <KeyRound size={17} />
              Alterar senha
            </button>
            <button type="button" className="ghost-button logout-button" onClick={logout}>
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar-panel" aria-label="Sessao ativa">
          <div className="sidebar-card">
            <div className="sidebar-heading">
              <span className="eyebrow">Painel</span>
              <h2>Sessao ativa</h2>
            </div>

            <div className="session-card">
              <span className="session-label">Usuario</span>
              <div className="session-user-row">
                <UserAvatar name={session.user.nome} photo={session.user.fotoPerfil} size="sm" decorative />
                <strong>{session.user.nome}</strong>
              </div>
            </div>

            <div className="session-card">
              <span className="session-label">Perfil</span>
              <strong>{currentUserProfile}</strong>
              <span className="session-meta">{currentUserProfile} | {session.user.email}</span>
            </div>

            <nav className="side-nav" role="tablist" aria-label="Navegacao principal">
              <button
                type="button"
                className={activeView === 'dashboard' ? 'active' : ''}
                onClick={openDashboard}
              >
                <LayoutDashboard size={18} />
                <span>Painel</span>
              </button>
              <button
                type="button"
                className={activeView === 'users' ? 'active' : ''}
                onClick={openUsersList}
              >
                <Users size={18} />
                <span>Usuarios</span>
                <span className="side-nav-count">{usersCount}</span>
              </button>
              <button
                type="button"
                className={activeView === 'patients' ? 'active' : ''}
                onClick={openPatientsList}
              >
                <ClipboardList size={18} />
                <span>Pacientes</span>
                <span className="side-nav-count">{pacientesCount}</span>
              </button>
            </nav>
          </div>
        </aside>

        <div className={`app-content ${activeView === 'dashboard' ? 'dashboard-content' : ''}`}>
      {activeView === 'dashboard' ? (
        <section className="dashboard-workspace">
          <div className="dashboard-header">
            <div>
              <span className="eyebrow">Modulos</span>
              <h2>Cadastros Hemodinks</h2>
            </div>
          </div>

          {successMessage && <p className="alert success"><CheckCircle2 size={17} />{successMessage}</p>}
          {dashboardError && <p className="alert error">{dashboardError}</p>}

          <div className="module-grid">
            <button type="button" className="module-card" onClick={openUsersList} aria-label="Abrir usuarios">
              <span className="module-card-menu" aria-hidden="true"><GripVertical size={20} /></span>
              <span className="module-icon"><Users size={24} /></span>
              <span className="module-title">Usuarios</span>
              <span className="module-metric">Gerenciar usuarios</span>
              <span className="module-card-foot">
                <span>{usersCount} cadastrados</span>
                <ArrowRight size={20} />
              </span>
            </button>

            <button type="button" className="module-card" onClick={openPatientsList} aria-label="Abrir pacientes">
              <span className="module-card-menu" aria-hidden="true"><GripVertical size={20} /></span>
              <span className="module-icon"><ClipboardList size={24} /></span>
              <span className="module-title">Pacientes</span>
              <span className="module-metric">Administrar atendimentos</span>
              <span className="module-card-foot">
                <span>{pacientesCount} cadastrados</span>
                <ArrowRight size={20} />
              </span>
            </button>
          </div>

          <section className="dashboard-info-panel" aria-label="Painel informativo">
            <div className="dashboard-info-title">
              <span className="eyebrow">Painel informativo</span>
              <h3>Resumo geral</h3>
            </div>

            <div className="info-summary-grid">
              <div className="info-summary-item">
                <span className="info-summary-icon"><Users size={18} /></span>
                <span className="info-summary-label">Usuarios ativos</span>
                <strong>{activeUsersCount}</strong>
              </div>
              <div className="info-summary-item">
                <span className="info-summary-icon"><CircleCheck size={18} /></span>
                <span className="info-summary-label">Pacientes ativos</span>
                <strong>{activePatientsCount}</strong>
              </div>
              <div className="info-summary-item">
                <span className="info-summary-icon amber"><Info size={18} /></span>
                <span className="info-summary-label">Pendencias</span>
                <strong>{pendingPaymentsCount}</strong>
              </div>
              <div className="info-summary-item">
                <span className="info-summary-icon"><FileText size={18} /></span>
                <span className="info-summary-label">Arquivos</span>
                <strong>{patientFilesCount}</strong>
              </div>
            </div>
          </section>
        </section>
      ) : activeView === 'users' ? (
      <section className="workspace">
        {moduleMode === 'form' ? (
        <aside className="form-panel module-form-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{editingId ? 'Edicao' : 'Cadastro'}</span>
              <h2>{editingId ? 'Editar usuario' : 'Novo usuario'}</h2>
            </div>
            <div className="panel-title-actions">
              {!editingId && <span className="password-chip">Senha: {DEFAULT_PASSWORD}</span>}
              <button type="button" className="icon-button muted" onClick={closeUserForm} title="Voltar para lista">
                <X size={18} />
              </button>
            </div>
          </div>

          <form className="stack module-form-grid" onSubmit={handleSubmitUser}>
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
              CPF
              <input
                type="text"
                value={formData.cpf}
                onChange={(event) => setFormData((current) => ({ ...current, cpf: formatCpfInput(event.target.value) }))}
                inputMode="numeric"
                maxLength={MAX_CPF_LENGTH}
                placeholder="000.000.000-00"
                required
              />
            </label>

            <DateInput
              id="user-birth-date"
              label="Data de nascimento"
              value={formData.dataNascimento}
              onChange={(value) => setFormData((current) => ({ ...current, dataNascimento: value }))}
              required
            />

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
        ) : (

        <section className="data-panel">
          <div className="data-header">
            <div>
              <span className="eyebrow">Base de usuarios</span>
              <h2>{usersTotalItems} cadastrados</h2>
            </div>

            <div className="table-tools">
              <button type="button" className="ghost-button" onClick={openNewUserForm}>
                <Plus size={17} />
                Novo usuario
              </button>
              <label className="search-box">
                <Search size={17} />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar"
                />
              </label>
              <button type="button" className="icon-button" onClick={() => void loadUsers(session.token, currentPage, debouncedSearchTerm)} title="Atualizar lista">
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
                  <th>CPF</th>
                  <th>Perfil</th>
                  <th>Info</th>
                  <th aria-label="Acoes" />
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={7} className="empty-row">Carregando usuarios...</td>
                  </tr>
                ) : paginatedUsers.length ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.id}>
                      <td data-label="Nome">
                        <div className="name-cell">
                          <UserAvatar name={user.nome} photo={user.fotoPerfil} size="sm" />
                          <span>{user.nome}</span>
                        </div>
                      </td>
                      <td data-label="Email">{user.email}</td>
                      <td data-label="Telefone">{formatPhoneInput(user.telefone)}</td>
                      <td data-label="CPF">{formatCpfInput(user.cpf || '')}</td>
                      <td data-label="Perfil">{user.perfilNome || getProfileName(user.perfilId)}</td>
                      <td data-label="Info">
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
                      <td data-label="Acoes">
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

          <div className="pagination-bar">
            <span>
              {visibleStart}-{visibleEnd} de {usersTotalItems}
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
        )}
      </section>
      ) : (
      <section className="workspace patients-workspace">
        {moduleMode === 'form' ? (
        <aside className="form-panel module-form-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{editingPacienteId ? 'Edicao' : 'Cadastro'}</span>
              <h2>{editingPacienteId ? 'Editar paciente' : 'Novo paciente'}</h2>
            </div>
            <div className="panel-title-actions">
              {!editingPacienteId && <span className="password-chip">Senha: {DEFAULT_PASSWORD}</span>}
              <button type="button" className="icon-button muted" onClick={closePacienteForm} title="Voltar para lista">
                <X size={18} />
              </button>
            </div>
          </div>

          <form className="stack module-form-grid" onSubmit={handleSubmitPaciente}>
            <label>
              Nome do paciente
              <input
                type="text"
                value={pacienteFormData.nomePaciente}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, nomePaciente: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
                maxLength={MAX_NAME_LENGTH}
                required
              />
            </label>

            <label>
              CPF
              <input
                type="text"
                value={pacienteFormData.cpf}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, cpf: formatCpfInput(event.target.value) }))}
                inputMode="numeric"
                maxLength={MAX_CPF_LENGTH}
                placeholder="000.000.000-00"
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={pacienteFormData.email}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, email: event.target.value.slice(0, MAX_EMAIL_LENGTH) }))}
                maxLength={MAX_EMAIL_LENGTH}
                required
              />
            </label>

            <label>
              Telefone
              <input
                type="tel"
                value={pacienteFormData.telefone}
                onFocus={() => setPacienteFormData((current) => ({ ...current, telefone: formatPhoneInput(current.telefone) }))}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, telefone: formatPhoneInput(event.target.value) }))}
                inputMode="numeric"
                maxLength={MAX_PHONE_LENGTH}
                placeholder="+55 (81) 99999-9999"
                required
              />
            </label>

            <DateInput
              id="patient-birth-date"
              label="Data de nascimento"
              value={pacienteFormData.dataNascimento}
              onChange={(value) => setPacienteFormData((current) => ({ ...current, dataNascimento: value }))}
              required
            />

            <label>
              Hospital
              <input
                type="text"
                value={pacienteFormData.hospital}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, hospital: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
                maxLength={MAX_NAME_LENGTH}
              />
            </label>

            <label>
              Medico
              <select
                value={pacienteFormData.medico}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, medico: event.target.value }))}
                disabled={!medicalUsers.length && !pacienteFormData.medico}
              >
                <option value="">{medicalUsers.length ? 'Selecione um medico' : 'Nenhum medico cadastrado'}</option>
                {pacienteFormData.medico && !medicalUsers.some((user) => user.nome === pacienteFormData.medico) && (
                  <option value={pacienteFormData.medico}>
                    {pacienteFormData.medico} (fora do cadastro)
                  </option>
                )}
                {medicalUsers.map((user) => (
                  <option key={user.id} value={user.nome}>
                    {user.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Convenio
              <input
                type="text"
                value={pacienteFormData.convenio}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, convenio: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
                maxLength={MAX_NAME_LENGTH}
              />
            </label>

            <label>
              Procedimento
              <input
                type="text"
                value={pacienteFormData.procedimento}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, procedimento: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
                maxLength={MAX_NAME_LENGTH}
              />
            </label>

            <label>
              Autorizacao
              <input
                type="text"
                value={pacienteFormData.autorizacao}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, autorizacao: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
                maxLength={MAX_NAME_LENGTH}
              />
            </label>

            <div className="two-column-fields">
              <label>
                Pagamento
                <input
                  type="text"
                  value={pacienteFormData.pagamento}
                  onChange={(event) => setPacienteFormData((current) => ({ ...current, pagamento: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
                  maxLength={MAX_NAME_LENGTH}
                />
              </label>

              <label>
                Repasse/Glosa
                <input
                  type="text"
                  value={pacienteFormData.repasseGlosa}
                  onChange={(event) => setPacienteFormData((current) => ({ ...current, repasseGlosa: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
                  maxLength={MAX_NAME_LENGTH}
                />
              </label>
            </div>

            <div className="profile-photo-field">
              <label className="field-label" htmlFor="patient-photo-input">
                Foto
              </label>
              <div className="photo-uploader">
                <UserAvatar name={pacienteFormData.nomePaciente || 'Paciente'} photo={pacienteFormData.fotoPerfil} size="lg" />
                <div className="photo-actions">
                  <label className="ghost-button file-action" htmlFor="patient-photo-input">
                    <ImagePlus size={17} />
                    {pacienteFormData.fotoPerfil ? 'Trocar foto' : 'Adicionar foto'}
                  </label>
                  {pacienteFormData.fotoPerfil && (
                    <button type="button" className="ghost-button danger-text" onClick={() => setPacienteFormData((current) => ({ ...current, fotoPerfil: null }))}>
                      <Trash2 size={17} />
                      Remover
                    </button>
                  )}
                </div>
              </div>
              <input
                key={patientPhotoInputKey}
                id="patient-photo-input"
                className="sr-only"
                type="file"
                aria-label="Foto do paciente"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void handlePacientePhotoChange(event)}
              />
            </div>

            <div className="profile-photo-field">
              <label className="field-label" htmlFor="patient-file-input">
                Arquivos
              </label>
              <label className="ghost-button file-action full-width" htmlFor="patient-file-input">
                <FileUp size={17} />
                Selecionar arquivos
              </label>
              <input
                key={patientFileInputKey}
                id="patient-file-input"
                className="sr-only"
                type="file"
                aria-label="Arquivos do paciente"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                multiple
                onChange={handlePacienteFilesChange}
              />

              {pendingPatientFiles.length > 0 && (
                <ul className="file-list">
                  {pendingPatientFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <FileText size={15} />
                      <span>{file.name}</span>
                      <button type="button" className="icon-button muted mini" onClick={() => removePendingPatientFile(index)} title="Remover arquivo">
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {editingPaciente?.arquivos.length ? (
                <ul className="file-list">
                  {editingPaciente.arquivos.map((arquivo) => (
                    <li key={arquivo.id}>
                      <FileText size={15} />
                      <a href={arquivo.url} target="_blank" rel="noreferrer">{arquivo.nomeOriginal}</a>
                      <button type="button" className="icon-button muted mini" onClick={() => void handleDeletePacienteArquivo(editingPaciente, arquivo.id)} title="Excluir arquivo">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={pacienteFormData.statusPago}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, statusPago: event.target.checked }))}
              />
              Status Pago
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={pacienteFormData.ativo}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, ativo: event.target.checked }))}
              />
              Paciente ativo
            </label>

            {pacienteFormError && <p className="alert error">{pacienteFormError}</p>}

            <button className="primary-action" type="submit" disabled={pacienteFormLoading}>
              {editingPacienteId ? <Save size={18} /> : <Plus size={18} />}
              {pacienteFormLoading ? 'Salvando...' : editingPacienteId ? 'Salvar paciente' : 'Cadastrar paciente'}
            </button>
          </form>
        </aside>
        ) : (

        <section className="data-panel">
          <div className="data-header">
            <div>
              <span className="eyebrow">Cadastro de pacientes</span>
              <h2>{pacientesTotalItems} cadastrados</h2>
            </div>

            <div className="table-tools">
              <button type="button" className="ghost-button" onClick={openNewPacienteForm}>
                <Plus size={17} />
                Novo paciente
              </button>
              <label className="search-box">
                <Search size={17} />
                <input
                  type="search"
                  value={pacienteSearchTerm}
                  onChange={(event) => setPacienteSearchTerm(event.target.value)}
                  placeholder="Buscar"
                />
              </label>
              <button type="button" className="icon-button" onClick={() => void loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm)} title="Atualizar lista">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {pacienteSuccessMessage && <p className="alert success"><CheckCircle2 size={17} />{pacienteSuccessMessage}</p>}
          {pacientesError && <p className="alert error">{pacientesError}</p>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>CPF</th>
                  <th>Hospital</th>
                  <th>Medico</th>
                  <th>Convenio</th>
                  <th>Procedimento</th>
                  <th>Status Pago</th>
                  <th>Arquivos</th>
                  <th aria-label="Acoes" />
                </tr>
              </thead>
              <tbody>
                {pacientesLoading ? (
                  <tr>
                    <td colSpan={9} className="empty-row">Carregando pacientes...</td>
                  </tr>
                ) : paginatedPacientes.length ? (
                  paginatedPacientes.map((paciente) => (
                    <tr key={paciente.id}>
                      <td data-label="Paciente">
                        <div className="name-cell">
                          <UserAvatar name={paciente.nomePaciente} photo={paciente.fotoPerfil} size="sm" />
                          <span>{paciente.nomePaciente}</span>
                        </div>
                      </td>
                      <td data-label="CPF">{formatCpfInput(paciente.cpf || '')}</td>
                      <td data-label="Hospital">{paciente.hospital || '-'}</td>
                      <td data-label="Medico">{paciente.medico || '-'}</td>
                      <td data-label="Convenio">{paciente.convenio || '-'}</td>
                      <td data-label="Procedimento">{paciente.procedimento || '-'}</td>
                      <td data-label="Status Pago">
                        <span className={`status-pill ${paciente.statusPago ? 'ok' : 'warning'}`}>
                          {paciente.statusPago ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td data-label="Arquivos">
                        <span className="attachment-count">
                          <FileText size={15} />
                          {paciente.arquivosCount ?? paciente.arquivos.length}
                        </span>
                      </td>
                      <td data-label="Acoes">
                        <div className="row-actions">
                          <button type="button" className="icon-button muted" onClick={() => void handleEditPaciente(paciente)} title="Editar">
                            <Pencil size={17} />
                          </button>
                          <button type="button" className="icon-button danger" onClick={() => void handleDeletePaciente(paciente)} title="Excluir">
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="empty-row">Nenhum paciente encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span>
              {pacienteVisibleStart}-{pacienteVisibleEnd} de {pacientesTotalItems}
            </span>
            <div className="pagination-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => setPacienteCurrentPage((page) => Math.max(1, page - 1))}
                disabled={pacienteCurrentPage === 1}
                title="Pagina anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="page-indicator">Pagina {pacienteCurrentPage} de {pacienteTotalPages}</span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setPacienteCurrentPage((page) => Math.min(pacienteTotalPages, page + 1))}
                disabled={pacienteCurrentPage === pacienteTotalPages}
                title="Proxima pagina"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>
        )}
      </section>
      )}
        </div>
      </div>

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

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`}>
              {item.onClick && !isLast ? (
                <button type="button" className="breadcrumb-button" onClick={item.onClick}>
                  {item.label}
                </button>
              ) : (
                <span className="breadcrumb-current" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight size={14} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type DateInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function DateInput({ id, label, value, onChange, required = false }: DateInputProps) {
  return (
    <div className="date-field">
      <label htmlFor={id}>{label}</label>
      <div className="date-input-control">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(formatDateInput(event.target.value))}
          inputMode="numeric"
          maxLength={10}
          placeholder="dd/mm/yyyy"
          required={required}
        />
        <span className="date-picker-button" title={`Selecionar ${label.toLowerCase()}`}>
          <CalendarDays size={17} />
          <input
            type="date"
            value={toDatePickerValue(value)}
            onChange={(event) => onChange(fromDatePickerValue(event.target.value))}
            max={getTodayPickerValue()}
            aria-label={`Selecionar ${label.toLowerCase()}`}
          />
        </span>
      </div>
    </div>
  );
}

type UserAvatarProps = {
  name: string;
  photo?: string | null;
  size?: 'sm' | 'lg';
  decorative?: boolean;
};

function UserAvatar({ name, photo, size = 'sm', decorative = false }: UserAvatarProps) {
  if (photo) {
    return (
      <img
        className={`user-avatar ${size}`}
        src={photo}
        alt={decorative ? '' : `Foto de ${name}`}
        aria-hidden={decorative ? true : undefined}
      />
    );
  }

  return (
    <span
      className={`user-avatar fallback ${size}`}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Sem foto de ${name}`}
      title={name}
    >
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
            <dt>CPF</dt>
            <dd>{formatCpfInput(user.cpf || '')}</dd>
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

function LoadingOverlay({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div className="loading-overlay" aria-live="polite">
      <div className="loading-overlay-panel">
        <span className="loading-spinner" aria-hidden="true" />
        <div>
          <strong>Aguarde...</strong>
          <span>Processando sua solicitação.</span>
        </div>
      </div>
    </div>
  );
}
