import { type ChangeEvent, type FormEvent, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  authenticate,
  createUser,
  createPaciente,
  deletePaciente,
  deletePacienteArquivo,
  deleteUser,
  deleteUserArquivo,
  getConvenios,
  getDashboardNotifications,
  getDashboardSummary,
  getCbhpmGeral,
  getHospitais,
  getPaciente,
  getPacientes,
  getUser,
  getUsers,
  resetPassword,
  updatePaciente,
  updateUser,
  uploadPacienteArquivo,
  uploadUserArquivo,
} from './api';
import { LoginScreen } from './features/auth/LoginScreen';
import { PasswordRequiredScreen } from './features/auth/PasswordRequiredScreen';
import { DashboardPage } from './features/dashboard/DashboardPage';
import {
  createXlsxBlob,
  downloadBlob,
  getPacienteExportRows,
  getPatientExportFileName,
  pacienteExportColumns,
} from './features/patients/patientExport';
import {
  emptyPacienteFilters,
  emptyPacienteForm,
  getPacienteFilterQuery,
  getPacienteFormData,
  normalizePacienteProcedimentos,
  toPacientePayload,
  validatePacienteForm,
  withPrimaryProcedimento,
} from './features/patients/patientUtils';
import {
  emptyUserForm,
  getUserFormData,
  toUserPayload,
  validateUserForm,
} from './features/users/userUtils';
import { ContactModal, InfoModal } from './features/users/UserModals';
import { AppShell } from './layout/AppShell';
import type {
  AppView,
  BreadcrumbItem,
  CbhpmFilters,
  ModuleMode,
  PacienteExportFormat,
  PacienteExportScope,
  PacienteFilters,
  Theme,
} from './appTypes';
import { readProfilePhoto } from './shared/utils/files';
import {
  ALLOWED_PATIENT_FILE_TYPES,
  ALLOWED_PROFILE_PHOTO_TYPES,
  CBHPM_PAGE_SIZE,
  DEFAULT_PASSWORD,
  DEFAULT_PROFILE_ID,
  findConvenioByDescription,
  findMedicalUserByName,
  getErrorMessage,
  getProfileName,
  isValidEmail,
  LOOKUP_PAGE_SIZE,
  MAX_PATIENT_FILE_BYTES,
  MAX_PROFILE_PHOTO_BYTES,
  MEDICAL_PROFILE_ID,
  PAGE_SIZE,
  PATIENT_EXPORT_PAGE_SIZE,
} from './shared/utils/formatters';
import {
  getPagedItems,
  getPagedTotal,
  getPagedTotalPages,
  sortConveniosByDescription,
  sortPacientesForListing,
  sortUsersByName,
  sortUsersForListing,
} from './shared/utils/listing';
import { queryClient } from './queryClient';
import type {
  AuthSession,
  CbhpmGeral,
  Convenio,
  DashboardNotification,
  DashboardSummary,
  Hospital,
  Paciente,
  PacienteFormData,
  User,
  UserFormData,
} from './types';

const SESSION_KEY = 'hemodinks.session';
const THEME_KEY = 'hemodinks.theme';
const DASHBOARD_CACHE_TIME_MS = 30 * 1000;
const LIST_CACHE_TIME_MS = 20 * 1000;
const LOOKUP_CACHE_TIME_MS = 5 * 60 * 1000;
const NOTIFICATIONS_CACHE_TIME_MS = 15 * 1000;

const NotificationsModal = lazy(() => import('./features/dashboard/NotificationsModal').then((module) => ({ default: module.NotificationsModal })));
const AgendaPage = lazy(() => import('./features/events/AgendaPage').then((module) => ({ default: module.AgendaPage })));
const CbhpmLookupModal = lazy(() => import('./features/patients/CbhpmLookupModal').then((module) => ({ default: module.CbhpmLookupModal })));
const PatientInfoModal = lazy(() => import('./features/patients/PatientModals').then((module) => ({ default: module.PatientInfoModal })));
const PatientFilesModal = lazy(() => import('./features/patients/PatientModals').then((module) => ({ default: module.PatientFilesModal })));
const PatientsPage = lazy(() => import('./features/patients/PatientsPage').then((module) => ({ default: module.PatientsPage })));
const UsersPage = lazy(() => import('./features/users/UsersPage').then((module) => ({ default: module.UsersPage })));
const PasswordModal = lazy(() => import('./shared/components/PasswordModal').then((module) => ({ default: module.PasswordModal })));

const emptyCbhpmFilters: CbhpmFilters = {
  codigo: '',
  procedimento: '',
  porte: '',
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

function ModuleFallback() {
  return (
    <section className="workspace" aria-live="polite">
      <section className="data-panel">
        <p className="agenda-empty" role="status">Carregando modulo...</p>
      </section>
    </section>
  );
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
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');

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
  const [editingUserDetails, setEditingUserDetails] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [userFileInputKey, setUserFileInputKey] = useState(0);
  const [pendingUserFiles, setPendingUserFiles] = useState<File[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedInfoUser, setSelectedInfoUser] = useState<User | null>(null);
  const [selectedContactUser, setSelectedContactUser] = useState<User | null>(null);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacientesLoading, setPacientesLoading] = useState(false);
  const [pacientesError, setPacientesError] = useState('');
  const [pacienteSuccessMessage, setPacienteSuccessMessage] = useState('');
  const [pacienteSearchTerm, setPacienteSearchTerm] = useState('');
  const [debouncedPacienteSearchTerm, setDebouncedPacienteSearchTerm] = useState('');
  const [pacienteExportLoading, setPacienteExportLoading] = useState<PacienteExportFormat | null>(null);
  const [pacienteExportScope, setPacienteExportScope] = useState<PacienteExportScope>('visible');
  const [pacienteFilters, setPacienteFilters] = useState<PacienteFilters>(emptyPacienteFilters);
  const [debouncedPacienteFilters, setDebouncedPacienteFilters] = useState<PacienteFilters>(emptyPacienteFilters);
  const [pacienteCurrentPage, setPacienteCurrentPage] = useState(1);
  const [pacientesTotalItems, setPacientesTotalItems] = useState(0);
  const [pacientesTotalPages, setPacientesTotalPages] = useState(1);
  const [pacienteFormData, setPacienteFormData] = useState<PacienteFormData>(emptyPacienteForm);
  const [editingPacienteId, setEditingPacienteId] = useState<number | null>(null);
  const [editingPacienteDetails, setEditingPacienteDetails] = useState<Paciente | null>(null);
  const [pacienteFormLoading, setPacienteFormLoading] = useState(false);
  const [pacienteFormError, setPacienteFormError] = useState('');
  const [patientFileInputKey, setPatientFileInputKey] = useState(0);
  const [pendingPatientFiles, setPendingPatientFiles] = useState<File[]>([]);
  const [selectedPatientInfo, setSelectedPatientInfo] = useState<Paciente | null>(null);
  const [selectedPatientFiles, setSelectedPatientFiles] = useState<Paciente | null>(null);
  const [patientFilesModalLoading, setPatientFilesModalLoading] = useState(false);
  const [patientFilesModalError, setPatientFilesModalError] = useState('');
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [hospitaisError, setHospitaisError] = useState('');
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [conveniosError, setConveniosError] = useState('');
  const [cbhpmModalOpen, setCbhpmModalOpen] = useState(false);
  const [cbhpmItems, setCbhpmItems] = useState<CbhpmGeral[]>([]);
  const [cbhpmFilters, setCbhpmFilters] = useState<CbhpmFilters>(emptyCbhpmFilters);
  const [debouncedCbhpmFilters, setDebouncedCbhpmFilters] = useState<CbhpmFilters>(emptyCbhpmFilters);
  const [cbhpmCurrentPage, setCbhpmCurrentPage] = useState(1);
  const [cbhpmTotalItems, setCbhpmTotalItems] = useState(0);
  const [cbhpmTotalPages, setCbhpmTotalPages] = useState(1);
  const [cbhpmLoading, setCbhpmLoading] = useState(false);
  const [cbhpmError, setCbhpmError] = useState('');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.colorScheme = 'light';
    }

    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => current === 'light' ? 'dark' : 'light');
  };

  const persistSession = (nextSession: AuthSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const isBusy = loginLoading || resetPasswordLoading || usersLoading || formLoading || pacientesLoading || pacienteFormLoading;
  const currentPerfilId = session?.user.perfilId ?? 0;
  const isAdmin = currentPerfilId === 1;
  const isMedical = currentPerfilId === MEDICAL_PROFILE_ID;
  const isPatient = currentPerfilId === 3;
  const canAccessUsers = isAdmin;
  const canEditOwnUser = isMedical;
  const canCreatePatients = isAdmin || isMedical;
  const canEditPatients = isAdmin || isMedical;
  const canDeletePatients = isAdmin;
  const patientReadOnly = isPatient;
  const canUseUserForm = isAdmin || (canEditOwnUser && editingId === session?.user.id);

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    queryClient.clear();
    setSession(null);
    setDashboardSummary(null);
    setNotificationsOpen(false);
    setNotifications([]);
    setNotificationsError('');
    setUsers([]);
    setUsersTotalItems(0);
    setUsersTotalPages(1);
    setMedicalUsers([]);
    setHospitais([]);
    setHospitaisError('');
    setConvenios([]);
    setConveniosError('');
    setPacientes([]);
    setPacienteFilters(emptyPacienteFilters);
    setDebouncedPacienteFilters(emptyPacienteFilters);
    setPacientesTotalItems(0);
    setPacientesTotalPages(1);
    setActiveView('dashboard');
    setModuleMode('list');
    setLoginPassword('');
  };

  const loadDashboardSummary = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    setDashboardError('');

    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['dashboardSummary', token],
        queryFn: () => getDashboardSummary(token),
        staleTime: forceRefresh ? 0 : DASHBOARD_CACHE_TIME_MS,
      });
      setDashboardSummary(result);
    } catch (error) {
      setDashboardError(getErrorMessage(error));
    }
  };

  const handleToggleNotifications = async () => {
    if (!session) {
      return;
    }

    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError('');

    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['dashboardNotifications', session.token],
        queryFn: () => getDashboardNotifications(session.token),
        staleTime: NOTIFICATIONS_CACHE_TIME_MS,
      });
      setNotifications(result);
    } catch (error) {
      setNotificationsError(getErrorMessage(error));
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadUsers = async (
    token = session?.token,
    page = currentPage,
    search = debouncedSearchTerm,
    forceRefresh = false,
  ) => {
    if (!token) {
      return;
    }

    setUsersLoading(true);
    setUsersError('');

    try {
      const query = {
        page,
        pageSize: PAGE_SIZE,
        search,
      };
      const result = await queryClient.fetchQuery({
        queryKey: ['users', token, query],
        queryFn: () => getUsers(token, query),
        staleTime: forceRefresh ? 0 : LIST_CACHE_TIME_MS,
      });
      setUsers(sortUsersForListing(getPagedItems(result)));
      setUsersTotalItems(getPagedTotal(result));
      setUsersTotalPages(getPagedTotalPages(result));
    } catch (error) {
      setUsersError(getErrorMessage(error));
    } finally {
      setUsersLoading(false);
    }
  };

  const loadMedicalUsers = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    try {
      const query = {
        page: 1,
        pageSize: LOOKUP_PAGE_SIZE,
        profileId: MEDICAL_PROFILE_ID,
      };
      const result = await queryClient.fetchQuery({
        queryKey: ['medicalUsers', token],
        queryFn: () => getUsers(token, query),
        staleTime: forceRefresh ? 0 : LOOKUP_CACHE_TIME_MS,
      });
      setMedicalUsers(sortUsersByName(getPagedItems(result)));
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
  };

  const loadPacientes = async (
    token = session?.token,
    page = pacienteCurrentPage,
    search = debouncedPacienteSearchTerm,
    filters = debouncedPacienteFilters,
    forceRefresh = false,
  ) => {
    if (!token) {
      return;
    }

    setPacientesLoading(true);
    setPacientesError('');

    try {
      const query = {
        page,
        pageSize: PAGE_SIZE,
        search,
        ...getPacienteFilterQuery(filters, isAdmin),
      };
      const result = await queryClient.fetchQuery({
        queryKey: ['pacientes', token, query],
        queryFn: () => getPacientes(token, query),
        staleTime: forceRefresh ? 0 : LIST_CACHE_TIME_MS,
      });
      setPacientes(sortPacientesForListing(getPagedItems(result)));
      setPacientesTotalItems(getPagedTotal(result));
      setPacientesTotalPages(getPagedTotalPages(result));
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    } finally {
      setPacientesLoading(false);
    }
  };

  const fetchPacientesForExport = async (query: NonNullable<Parameters<typeof getPacientes>[1]>) => {
    if (!session) {
      return [];
    }

    const firstResult = await getPacientes(session.token, {
      page: 1,
      pageSize: PATIENT_EXPORT_PAGE_SIZE,
      ...query,
    });

    const items = [...getPagedItems(firstResult)];
    const totalPagesForExport = getPagedTotalPages(firstResult);

    for (let page = 2; page <= totalPagesForExport; page += 1) {
      const result = await getPacientes(session.token, {
        ...query,
        page,
        pageSize: PATIENT_EXPORT_PAGE_SIZE,
      });
      items.push(...getPagedItems(result));
    }

    return sortPacientesForListing(items);
  };

  const loadPacientesForExport = async (scope: PacienteExportScope) => {
    if (scope === 'visible') {
      return paginatedPacientes;
    }

    if (scope === 'doctor') {
      const medico = pacienteFilters.medico.trim();

      if (!medico) {
        throw new Error('Selecione um medico antes de exportar por medico.');
      }

      return fetchPacientesForExport({ medico });
    }

    return fetchPacientesForExport({});
  };

  const handleExportPacientes = async (format: PacienteExportFormat) => {
    if (!session || pacienteExportLoading) {
      return;
    }

    setPacienteExportLoading(format);
    setPacientesError('');

    try {
      const exportItems = await loadPacientesForExport(pacienteExportScope);
      const rows = getPacienteExportRows(exportItems);

      if (format === 'xlsx') {
        downloadBlob(createXlsxBlob(rows), getPatientExportFileName('xlsx'));
        return;
      }

      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = autoTableModule.default;
      const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      document.setFontSize(14);
      document.text('Cadastro de pacientes', 40, 34);
      document.setFontSize(9);
      document.text(`Gerado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, 40, 50);
      autoTable(document, {
        head: [pacienteExportColumns.map((column) => column.header)],
        body: exportItems.map((paciente) => pacienteExportColumns.map((column) => column.getValue(paciente))),
        startY: 64,
        styles: {
          fontSize: 6.6,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: 255,
        },
        margin: { left: 24, right: 24 },
      });
      document.save(getPatientExportFileName('pdf'));
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    } finally {
      setPacienteExportLoading(null);
    }
  };

  const loadCbhpm = async (
    token = session?.token,
    page = cbhpmCurrentPage,
    filters = debouncedCbhpmFilters,
    forceRefresh = false,
  ) => {
    if (!token) {
      return;
    }

    setCbhpmLoading(true);
    setCbhpmError('');

    try {
      const query = {
        page,
        pageSize: CBHPM_PAGE_SIZE,
        codigo: filters.codigo,
        procedimento: filters.procedimento,
        porte: filters.porte,
      };
      const result = await queryClient.fetchQuery({
        queryKey: ['cbhpm', token, query],
        queryFn: () => getCbhpmGeral(token, query),
        staleTime: forceRefresh ? 0 : LIST_CACHE_TIME_MS,
      });
      setCbhpmItems(getPagedItems(result));
      setCbhpmTotalItems(getPagedTotal(result));
      setCbhpmTotalPages(getPagedTotalPages(result));
    } catch (error) {
      setCbhpmError(getErrorMessage(error));
    } finally {
      setCbhpmLoading(false);
    }
  };

  const loadHospitais = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    setHospitaisError('');

    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['hospitais', token],
        queryFn: () => getHospitais(token),
        staleTime: forceRefresh ? 0 : LOOKUP_CACHE_TIME_MS,
      });
      setHospitais(result);
    } catch (error) {
      setHospitaisError(getErrorMessage(error));
    }
  };

  const loadConvenios = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    setConveniosError('');

    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['convenios', token],
        queryFn: () => getConvenios(token),
        staleTime: forceRefresh ? 0 : LOOKUP_CACHE_TIME_MS,
      });
      setConvenios(sortConveniosByDescription(result));
    } catch (error) {
      setConveniosError(getErrorMessage(error));
    }
  };

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha) {
      void loadDashboardSummary(session.token);
      void loadHospitais(session.token);
      void loadConvenios(session.token);
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
  const cbhpmTotalPageCount = Math.max(1, cbhpmTotalPages);
  const cbhpmPageStart = (cbhpmCurrentPage - 1) * CBHPM_PAGE_SIZE;
  const cbhpmPageEnd = cbhpmPageStart + CBHPM_PAGE_SIZE;
  const cbhpmVisibleStart = cbhpmTotalItems ? cbhpmPageStart + 1 : 0;
  const cbhpmVisibleEnd = Math.min(cbhpmPageEnd, cbhpmTotalItems);
  const activeUsersCount = dashboardSummary?.activeUsersCount ?? 0;
  const activePatientsCount = dashboardSummary?.activePatientsCount ?? 0;
  const pendingPaymentsCount = dashboardSummary?.pendingPaymentsCount ?? 0;
  const patientFilesCount = dashboardSummary?.patientFilesCount ?? 0;
  const upcomingEventsCount = dashboardSummary?.upcomingEventsCount ?? 0;
  const notificationCount = notificationsOpen && notifications.length
    ? notifications.length
    : pendingPaymentsCount + upcomingEventsCount;
  const usersCount = dashboardSummary?.usersCount ?? usersTotalItems;
  const pacientesCount = dashboardSummary?.pacientesCount ?? pacientesTotalItems;
  const editingPaciente = useMemo(
    () => editingPacienteDetails ?? pacientes.find((paciente) => paciente.id === editingPacienteId) ?? null,
    [editingPacienteDetails, editingPacienteId, pacientes],
  );

  useEffect(() => {
    if (searchTerm === debouncedSearchTerm) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, debouncedSearchTerm]);

  useEffect(() => {
    if (pacienteSearchTerm === debouncedPacienteSearchTerm) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPacienteCurrentPage(1);
      setDebouncedPacienteSearchTerm(pacienteSearchTerm);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [pacienteSearchTerm, debouncedPacienteSearchTerm]);

  useEffect(() => {
    if (
      pacienteFilters.medico === debouncedPacienteFilters.medico
      && pacienteFilters.convenio === debouncedPacienteFilters.convenio
      && pacienteFilters.procedimento === debouncedPacienteFilters.procedimento
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPacienteCurrentPage(1);
      setDebouncedPacienteFilters(pacienteFilters);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [pacienteFilters, debouncedPacienteFilters]);

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    setPacienteFilters(emptyPacienteFilters);
    setDebouncedPacienteFilters(emptyPacienteFilters);
  }, [isAdmin]);

  useEffect(() => {
    if (
      cbhpmFilters.codigo === debouncedCbhpmFilters.codigo
      && cbhpmFilters.procedimento === debouncedCbhpmFilters.procedimento
      && cbhpmFilters.porte === debouncedCbhpmFilters.porte
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCbhpmCurrentPage(1);
      setDebouncedCbhpmFilters(cbhpmFilters);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [cbhpmFilters, debouncedCbhpmFilters]);

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha && canAccessUsers && activeView === 'users' && moduleMode === 'list') {
      void loadUsers(session.token, currentPage, debouncedSearchTerm);
    }
  }, [session?.token, session?.user.precisaTrocarSenha, canAccessUsers, activeView, moduleMode, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha && activeView === 'patients') {
      if (moduleMode === 'list') {
        void loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters);
      }

      if (isAdmin) {
        void loadMedicalUsers(session.token);
      }
    }
  }, [session?.token, session?.user.precisaTrocarSenha, isAdmin, activeView, moduleMode, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters]);

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha && cbhpmModalOpen) {
      void loadCbhpm(session.token, cbhpmCurrentPage, debouncedCbhpmFilters);
    }
  }, [session?.token, session?.user.precisaTrocarSenha, cbhpmModalOpen, cbhpmCurrentPage, debouncedCbhpmFilters]);

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

  useEffect(() => {
    if (cbhpmCurrentPage > cbhpmTotalPageCount) {
      setCbhpmCurrentPage(cbhpmTotalPageCount);
    }
  }, [cbhpmCurrentPage, cbhpmTotalPageCount]);

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
      queryClient.clear();
      persistSession({
        token: result.token,
        user: {
          id: result.id,
          nome: result.nome,
          email: result.email,
          cpf: result.cpf ?? null,
          crm: result.crm ?? null,
          crmUf: result.crmUf ?? null,
          fotoPerfil: result.fotoPerfil ?? null,
          precisaTrocarSenha: result.precisaTrocarSenha || loginPassword === DEFAULT_PASSWORD,
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

  const handleResetPassword = async () => {
    setLoginError('');
    setLoginInfo('');

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido para resetar a senha.');
      return;
    }

    setResetPasswordLoading(true);

    try {
      await resetPassword(loginEmail.trim());
      setLoginPassword(DEFAULT_PASSWORD);
      setLoginInfo(`Senha redefinida para ${DEFAULT_PASSWORD}. Use-a para entrar e altere a seguir.`);
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const resetUserForm = () => {
    setFormData(emptyUserForm);
    setEditingId(null);
    setEditingUserDetails(null);
    setFormError('');
    setPendingUserFiles([]);
    setPhotoInputKey((key) => key + 1);
    setUserFileInputKey((key) => key + 1);
  };

  const applyUserToForm = (user: User) => {
    setEditingId(user.id);
    setFormData(getUserFormData(user));
    setPhotoInputKey((key) => key + 1);
    setUserFileInputKey((key) => key + 1);
  };

  const handleEditUser = async (user: User) => {
    if (!session) {
      return;
    }

    applyUserToForm(user);
    setEditingUserDetails(user);
    setFormError('');
    setSuccessMessage('');
    setPendingUserFiles([]);
    setActiveView('users');
    setModuleMode('form');

    try {
      setFormLoading(true);
      const details = await getUser(user.id, session.token);
      setEditingUserDetails(details);
      applyUserToForm(details);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
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

  const handleUserFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!files.length) {
      return;
    }

    const invalidFile = files.find((file) => !ALLOWED_PATIENT_FILE_TYPES.has(file.type) || file.size > MAX_PATIENT_FILE_BYTES);

    if (invalidFile) {
      setFormError('Use PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX, TXT, CSV, PPT ou PPTX de ate 10 MB.');
      return;
    }

    setPendingUserFiles((current) => [...current, ...files]);
    setFormError('');
  };

  const removePendingUserFile = (indexToRemove: number) => {
    setPendingUserFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleDeleteUserArquivo = async (user: User, arquivoId: number) => {
    if (!session) {
      return;
    }

    setFormError('');

    try {
      await deleteUserArquivo(user.id, arquivoId, session.token);
      const details = await getUser(user.id, session.token);
      setEditingUserDetails(details);
      applyUserToForm(details);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const resetPacienteForm = () => {
    setPacienteFormData(emptyPacienteForm);
    setEditingPacienteId(null);
    setEditingPacienteDetails(null);
    setPacienteFormError('');
    setPendingPatientFiles([]);
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
    setPacienteFormData(getPacienteFormData(paciente));
    setPatientFileInputKey((key) => key + 1);

    try {
      const details = await getPaciente(paciente.id, session.token);
      setEditingPacienteDetails(details);
      setPacienteFormData(getPacienteFormData(details));
    } catch (error) {
      setPacienteFormError(getErrorMessage(error));
    }
  };

  const handlePacienteFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (patientReadOnly) {
      return;
    }

    if (!files.length) {
      return;
    }

    const invalidFile = files.find((file) => !ALLOWED_PATIENT_FILE_TYPES.has(file.type) || file.size > MAX_PATIENT_FILE_BYTES);

    if (invalidFile) {
      setPacienteFormError('Use PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX, TXT, CSV, PPT ou PPTX de ate 10 MB.');
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

    if (patientReadOnly) {
      setPacienteFormError('Pacientes podem apenas visualizar o cadastro.');
      return;
    }

    const validationError = validatePacienteForm(pacienteFormData);

    if (validationError) {
      setPacienteFormError(validationError);
      return;
    }

    const selectedMedicoUser = pacienteFormData.medicoUserId != null
      ? medicalUsers.find((user) => user.id === pacienteFormData.medicoUserId)
      : findMedicalUserByName(medicalUsers, pacienteFormData.medico);

    if (isAdmin && pacienteFormData.medico && !selectedMedicoUser) {
      setPacienteFormError('Selecione um medico cadastrado com perfil Medicos.');
      return;
    }

    const selectedConvenio = pacienteFormData.convenioId != null
      ? convenios.find((convenio) => convenio.idConvenio === pacienteFormData.convenioId)
      : findConvenioByDescription(convenios, pacienteFormData.convenio);

    if (pacienteFormData.convenio && !selectedConvenio) {
      setPacienteFormError('Selecione um convenio cadastrado.');
      return;
    }

    const payload = toPacientePayload({
      ...pacienteFormData,
      medicoUserId: selectedMedicoUser?.id ?? pacienteFormData.medicoUserId,
      medico: selectedMedicoUser?.nome ?? pacienteFormData.medico,
      convenioId: selectedConvenio?.idConvenio ?? null,
      convenio: selectedConvenio?.descricaoConvenio ?? '',
    });

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['pacientes', session.token] }),
      ]);
      resetPacienteForm();
      setPacienteCurrentPage(1);
      setModuleMode('list');
      await loadDashboardSummary(session.token, true);
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

    if (!canDeletePatients) {
      setPacientesError('Apenas administradores podem excluir pacientes.');
      return;
    }

    setPacientesError('');
    setPacienteSuccessMessage('');

    try {
      await deletePaciente(paciente.id, session.token);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['pacientes', session.token] }),
      ]);
      setPacienteSuccessMessage('Paciente excluido.');
      await loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters, true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
  };

  const handleDeletePacienteArquivo = async (paciente: Paciente, arquivoId: number) => {
    if (!session) {
      return;
    }

    if (!canEditPatients) {
      setPacientesError('Sem permissao para excluir arquivo do paciente.');
      return;
    }

    setPacientesError('');

    try {
      await deletePacienteArquivo(paciente.id, arquivoId, session.token);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['pacientes', session.token] }),
      ]);
      const details = await getPaciente(paciente.id, session.token);
      setEditingPacienteDetails(details);
      await loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters, true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
  };

  const handleOpenPacienteFiles = async (paciente: Paciente) => {
    if (!session) {
      return;
    }

    const filesCount = paciente.arquivosCount ?? paciente.arquivos.length;

    if (!filesCount) {
      return;
    }

    setSelectedPatientFiles(paciente);
    setPatientFilesModalError('');
    setPatientFilesModalLoading(true);

    try {
      const details = await getPaciente(paciente.id, session.token);
      setSelectedPatientFiles(details);
    } catch (error) {
      setPatientFilesModalError(getErrorMessage(error));
    } finally {
      setPatientFilesModalLoading(false);
    }
  };

  const handleOpenCbhpmModal = () => {
    if (patientReadOnly) {
      return;
    }

    setCbhpmModalOpen(true);
    setCbhpmError('');
  };

  const handleSelectCbhpm = (procedimento: CbhpmGeral) => {
    setPacienteFormData((current) => {
      const nextProcedimentos = normalizePacienteProcedimentos([
        ...current.procedimentos,
        {
          cbhpmCodigo: procedimento.codigo,
          cbhpmPorte: procedimento.porte || '',
          procedimento: procedimento.procedimento,
          valorReferencia: procedimento.valorReferencia ?? null,
        },
      ]);

      return withPrimaryProcedimento({
        ...current,
        procedimentos: nextProcedimentos,
      });
    });
    setPacienteFormError('');
    setCbhpmModalOpen(false);
  };

  const handleRemovePacienteProcedimento = (indexToRemove: number) => {
    setPacienteFormData((current) => withPrimaryProcedimento({
      ...current,
      procedimentos: current.procedimentos.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSubmitUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    if (!canUseUserForm && !isAdmin) {
      setFormError('Sem permissao para editar este cadastro.');
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

      if (savedUser.perfilId === MEDICAL_PROFILE_ID) {
        for (const file of pendingUserFiles) {
          await uploadUserArquivo(savedUser.id, file, session.token);
        }
      }

      if (editingId && savedUser.id === session.user.id) {
        persistSession({
          ...session,
          user: {
            ...session.user,
            nome: savedUser.nome,
            email: savedUser.email,
            cpf: savedUser.cpf ?? null,
            crm: savedUser.crm ?? null,
            crmUf: savedUser.crmUf ?? null,
            fotoPerfil: savedUser.fotoPerfil ?? null,
            perfilId: savedUser.perfilId || DEFAULT_PROFILE_ID,
            perfilNome: savedUser.perfilNome || getProfileName(savedUser.perfilId || DEFAULT_PROFILE_ID),
          },
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['users', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['medicalUsers', session.token] }),
      ]);
      resetUserForm();
      setCurrentPage(1);
      setModuleMode('list');
      if (!isAdmin) {
        setActiveView('dashboard');
      }
      await loadDashboardSummary(session.token, true);
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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['users', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['medicalUsers', session.token] }),
      ]);
      setSuccessMessage('Usuario excluido.');
      await loadUsers(session.token, currentPage, debouncedSearchTerm, true);
      await loadDashboardSummary(session.token, true);
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
    : activeView === 'users' ? canAccessUsers ? 'Usuarios' : 'Meu cadastro'
      : activeView === 'patients' ? 'Pacientes' : 'Agenda';

  const openDashboard = () => {
    setActiveView('dashboard');
    setModuleMode('list');
  };

  const openUsersList = () => {
    if (!canAccessUsers) {
      setActiveView('dashboard');
      setModuleMode('list');
      return;
    }

    setActiveView('users');
    setModuleMode('list');
  };

  const openPatientsList = () => {
    setActiveView('patients');
    setModuleMode('list');
  };

  const openAgenda = () => {
    setActiveView('agenda');
    setModuleMode('list');
  };

  const openNewUserForm = () => {
    if (!canAccessUsers) {
      return;
    }

    resetUserForm();
    setSuccessMessage('');
    setActiveView('users');
    setModuleMode('form');
  };

  const closeUserForm = () => {
    resetUserForm();
    setModuleMode('list');

    if (!canAccessUsers) {
      setActiveView('dashboard');
    }
  };

  const openMyProfile = () => {
    if (!session || !canEditOwnUser) {
      return;
    }

    void handleEditUser({
      id: session.user.id,
      nome: session.user.nome,
      email: session.user.email,
      telefone: '',
      cpf: session.user.cpf ?? null,
      crm: session.user.crm ?? null,
      crmUf: session.user.crmUf ?? null,
      fotoPerfil: session.user.fotoPerfil ?? null,
      dataCadastro: '',
      dataNascimento: '',
      ativo: true,
      precisaTrocarSenha: session.user.precisaTrocarSenha,
      perfilId: session.user.perfilId,
      perfilNome: session.user.perfilNome,
      arquivosCount: 0,
      arquivos: [],
    });
  };

  const openNewPacienteForm = () => {
    if (!canCreatePatients) {
      return;
    }

    resetPacienteForm();
    if (isMedical && session) {
      setPacienteFormData((current) => ({
        ...current,
        medicoUserId: session.user.id,
        medico: session.user.nome,
      }));
    }
    setPacienteSuccessMessage('');
    setActiveView('patients');
    setModuleMode('form');

    if (session && isAdmin) {
      void loadMedicalUsers(session.token);
    }

    if (session && !hospitais.length) {
      void loadHospitais(session.token);
    }
  };

  const closePacienteForm = () => {
    resetPacienteForm();
    setModuleMode('list');
  };

  if (!session) {
    return (
      <LoginScreen
        isBusy={isBusy}
        theme={theme}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        loginError={loginError}
        loginInfo={loginInfo}
        loginLoading={loginLoading}
        resetPasswordLoading={resetPasswordLoading}
        onThemeToggle={toggleTheme}
        onLoginEmailChange={setLoginEmail}
        onLoginPasswordChange={setLoginPassword}
        onSubmit={handleLogin}
        onResetPassword={() => void handleResetPassword()}
      />
    );
  }

  if (session.user.precisaTrocarSenha) {
    return (
      <PasswordRequiredScreen
        session={session}
        isBusy={isBusy}
        theme={theme}
        onThemeToggle={toggleTheme}
        onPasswordChanged={handlePasswordChanged}
        onLogout={logout}
      />
    );
  }

  const currentUserProfile = session.user.perfilNome || getProfileName(session.user.perfilId);
  const formBreadcrumbLabel = activeView === 'users'
    ? canAccessUsers ? editingId ? 'Editar usuario' : 'Novo usuario' : 'Meu cadastro'
    : activeView === 'patients' ? editingPacienteId ? patientReadOnly ? 'Visualizar paciente' : 'Editar paciente' : 'Novo paciente'
      : 'Agenda';
  const activeModuleLabel = activeView === 'users'
    ? canAccessUsers ? 'Usuarios' : 'Meu cadastro'
    : activeView === 'patients' ? 'Pacientes' : 'Agenda';
  const openActiveModuleList = activeView === 'users'
    ? openUsersList
    : activeView === 'patients' ? openPatientsList : openAgenda;
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

  const mainContent = activeView === 'dashboard' ? (
    <DashboardPage
      canAccessUsers={canAccessUsers}
      canEditOwnUser={canEditOwnUser}
      patientReadOnly={patientReadOnly}
      usersCount={usersCount}
      pacientesCount={pacientesCount}
      activeUsersCount={activeUsersCount}
      activePatientsCount={activePatientsCount}
      pendingPaymentsCount={pendingPaymentsCount}
      patientFilesCount={patientFilesCount}
      upcomingEventsCount={upcomingEventsCount}
      successMessage={successMessage}
      dashboardError={dashboardError}
      onOpenUsersList={openUsersList}
      onOpenMyProfile={openMyProfile}
      onOpenPatientsList={openPatientsList}
      onOpenAgenda={openAgenda}
    />
  ) : activeView === 'users' ? (
    <UsersPage
      moduleMode={moduleMode}
      canAccessUsers={canAccessUsers}
      canUseUserForm={canUseUserForm}
      editingId={editingId}
      editingUserDetails={editingUserDetails}
      formData={formData}
      formError={formError}
      formLoading={formLoading}
      pendingUserFiles={pendingUserFiles}
      photoInputKey={photoInputKey}
      userFileInputKey={userFileInputKey}
      users={paginatedUsers}
      usersLoading={usersLoading}
      usersError={usersError}
      successMessage={successMessage}
      usersTotalItems={usersTotalItems}
      visibleStart={visibleStart}
      visibleEnd={visibleEnd}
      currentPage={currentPage}
      totalPages={totalPages}
      searchTerm={searchTerm}
      sessionToken={session.token}
      setFormData={setFormData}
      setSearchTerm={setSearchTerm}
      setCurrentPage={setCurrentPage}
      closeUserForm={closeUserForm}
      openNewUserForm={openNewUserForm}
      handleSubmitUser={handleSubmitUser}
      handleProfilePhotoChange={handleProfilePhotoChange}
      handleRemoveProfilePhoto={handleRemoveProfilePhoto}
      handleUserFilesChange={handleUserFilesChange}
      removePendingUserFile={removePendingUserFile}
      handleDeleteUserArquivo={handleDeleteUserArquivo}
      handleEditUser={handleEditUser}
      handleDeleteUser={handleDeleteUser}
      setSelectedInfoUser={setSelectedInfoUser}
      setSelectedContactUser={setSelectedContactUser}
      refreshUsers={() => void loadUsers(session.token, currentPage, debouncedSearchTerm, true)}
    />
  ) : activeView === 'patients' ? (
    <PatientsPage
      moduleMode={moduleMode}
      canCreatePatients={canCreatePatients}
      canEditPatients={canEditPatients}
      canDeletePatients={canDeletePatients}
      patientReadOnly={patientReadOnly}
      editingPacienteId={editingPacienteId}
      editingPaciente={editingPaciente}
      pacienteFormData={pacienteFormData}
      pacienteFormError={pacienteFormError}
      pacienteFormLoading={pacienteFormLoading}
      pendingPatientFiles={pendingPatientFiles}
      patientFileInputKey={patientFileInputKey}
      pacientes={paginatedPacientes}
      pacientesLoading={pacientesLoading}
      pacientesError={pacientesError}
      pacienteSuccessMessage={pacienteSuccessMessage}
      pacientesTotalItems={pacientesTotalItems}
      pacienteVisibleStart={pacienteVisibleStart}
      pacienteVisibleEnd={pacienteVisibleEnd}
      pacienteCurrentPage={pacienteCurrentPage}
      pacienteTotalPages={pacienteTotalPages}
      pacienteSearchTerm={pacienteSearchTerm}
      pacienteFilters={pacienteFilters}
      pacienteExportLoading={pacienteExportLoading}
      pacienteExportScope={pacienteExportScope}
      hospitais={hospitais}
      hospitaisError={hospitaisError}
      medicalUsers={medicalUsers}
      convenios={convenios}
      conveniosError={conveniosError}
      isAdmin={isAdmin}
      isMedical={isMedical}
      sessionToken={session.token}
      sessionUserName={session.user.nome}
      setPacienteFormData={setPacienteFormData}
      setPacienteSearchTerm={setPacienteSearchTerm}
      setPacienteFilters={setPacienteFilters}
      setPacienteExportScope={setPacienteExportScope}
      setPacienteCurrentPage={setPacienteCurrentPage}
      closePacienteForm={closePacienteForm}
      openNewPacienteForm={openNewPacienteForm}
      handleSubmitPaciente={handleSubmitPaciente}
      handleOpenCbhpmModal={handleOpenCbhpmModal}
      handleRemovePacienteProcedimento={handleRemovePacienteProcedimento}
      handlePacienteFilesChange={handlePacienteFilesChange}
      removePendingPatientFile={removePendingPatientFile}
      handleDeletePacienteArquivo={handleDeletePacienteArquivo}
      handleExportPacientes={handleExportPacientes}
      handleEditPaciente={handleEditPaciente}
      handleDeletePaciente={handleDeletePaciente}
      handleOpenPacienteFiles={handleOpenPacienteFiles}
      setSelectedPatientInfo={setSelectedPatientInfo}
      clearPacienteFilters={() => setPacienteFilters(emptyPacienteFilters)}
      refreshPacientes={() => void loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters, true)}
    />
  ) : (
    <AgendaPage
      session={session}
      isAdmin={isAdmin}
      isMedical={isMedical}
    />
  );

  const modals = (
    <Suspense fallback={null}>
      {selectedInfoUser && (
        <InfoModal user={selectedInfoUser} onClose={() => setSelectedInfoUser(null)} />
      )}

      {selectedContactUser && (
        <ContactModal user={selectedContactUser} onClose={() => setSelectedContactUser(null)} />
      )}

      {notificationsOpen && (
        <NotificationsModal
          notifications={notifications}
          loading={notificationsLoading}
          error={notificationsError}
          totalCount={notificationCount}
          onClose={() => setNotificationsOpen(false)}
        />
      )}

      {cbhpmModalOpen && (
        <CbhpmLookupModal
          items={cbhpmItems}
          filters={cbhpmFilters}
          loading={cbhpmLoading}
          error={cbhpmError}
          currentPage={cbhpmCurrentPage}
          totalPages={cbhpmTotalPageCount}
          totalItems={cbhpmTotalItems}
          visibleStart={cbhpmVisibleStart}
          visibleEnd={cbhpmVisibleEnd}
          onFiltersChange={setCbhpmFilters}
          onPageChange={setCbhpmCurrentPage}
          onRefresh={() => void loadCbhpm(session.token, cbhpmCurrentPage, debouncedCbhpmFilters, true)}
          onSelect={handleSelectCbhpm}
          onClose={() => setCbhpmModalOpen(false)}
        />
      )}

      {selectedPatientInfo && (
        <PatientInfoModal paciente={selectedPatientInfo} onClose={() => setSelectedPatientInfo(null)} />
      )}

      {selectedPatientFiles && (
        <PatientFilesModal
          paciente={selectedPatientFiles}
          loading={patientFilesModalLoading}
          error={patientFilesModalError}
          onClose={() => {
            setSelectedPatientFiles(null);
            setPatientFilesModalError('');
          }}
        />
      )}

      {showPasswordModal && (
        <PasswordModal
          session={session}
          onChanged={handlePasswordChanged}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </Suspense>
  );

  return (
    <AppShell
      session={session}
      isBusy={isBusy}
      appTitle={appTitle}
      activeView={activeView}
      breadcrumbItems={breadcrumbItems}
      theme={theme}
      notificationsOpen={notificationsOpen}
      notificationCount={notificationCount}
      currentUserProfile={currentUserProfile}
      canAccessUsers={canAccessUsers}
      canEditOwnUser={canEditOwnUser}
      usersCount={usersCount}
      pacientesCount={pacientesCount}
      medicalUsers={medicalUsers}
      convenios={convenios}
      onToggleNotifications={() => void handleToggleNotifications()}
      onToggleTheme={toggleTheme}
      onOpenPasswordModal={() => setShowPasswordModal(true)}
      onLogout={logout}
      onOpenDashboard={openDashboard}
      onOpenUsersList={openUsersList}
      onOpenMyProfile={openMyProfile}
      onOpenPatientsList={openPatientsList}
      onOpenAgenda={openAgenda}
      modals={modals}
    >
      <Suspense fallback={<ModuleFallback />}>
        {mainContent}
      </Suspense>
    </AppShell>
  );
}

