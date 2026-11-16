import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'
import { setErrorReporter, reportError } from './errorReporting'
import { TELEMETRY_OBFUSCATE_RULES } from './telemetryPrivacy'

let newRelicEnabled = false
let errorReportingAllowed = false
// Só erros que passaram por sanitizedErrorForTelemetry saem; a captura automática
// do agente (mensagem crua) é descartada no setErrorHandler (#262).
const sanitizedErrors = new WeakSet<object>()

type NewRelicConfig = {
  accountID: string
  agentID: string
  applicationID: string
  beacon: string
  errorBeacon: string
  licenseKey: string
  trustKey: string
}

function getTrimmedValue(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getNewRelicConfig(): NewRelicConfig | null {
  const applicationID = getTrimmedValue(import.meta.env.VITE_NEW_RELIC_APPLICATION_ID)
  const agentID = getTrimmedValue(import.meta.env.VITE_NEW_RELIC_AGENT_ID)
  const accountID = getTrimmedValue(import.meta.env.VITE_NEW_RELIC_ACCOUNT_ID)
  const licenseKey = getTrimmedValue(import.meta.env.VITE_NEW_RELIC_LICENSE_KEY)
  const trustKey = getTrimmedValue(import.meta.env.VITE_NEW_RELIC_TRUST_KEY)

  const hasAnyConfig = [
    import.meta.env.VITE_NEW_RELIC_APPLICATION_ID,
    import.meta.env.VITE_NEW_RELIC_AGENT_ID,
    import.meta.env.VITE_NEW_RELIC_ACCOUNT_ID,
    import.meta.env.VITE_NEW_RELIC_LICENSE_KEY,
    import.meta.env.VITE_NEW_RELIC_TRUST_KEY,
  ].some((value) => Boolean(value?.trim()))

  if (!hasAnyConfig) {
    return null
  }

  const missingKeys = [
    !applicationID && 'VITE_NEW_RELIC_APPLICATION_ID',
    !agentID && 'VITE_NEW_RELIC_AGENT_ID',
    !accountID && 'VITE_NEW_RELIC_ACCOUNT_ID',
    !licenseKey && 'VITE_NEW_RELIC_LICENSE_KEY',
  ].filter(Boolean)

  if (missingKeys.length > 0) {
    if (import.meta.env.DEV) {
      console.warn(`[newrelic] incomplete configuration: ${missingKeys.join(', ')}`)
    }

    return null
  }

  if (!applicationID || !agentID || !accountID || !licenseKey) {
    return null
  }

  const beacon = getTrimmedValue(import.meta.env.VITE_NEW_RELIC_BEACON) || 'bam.nr-data.net'
  const errorBeacon = getTrimmedValue(import.meta.env.VITE_NEW_RELIC_ERROR_BEACON) || beacon

  return {
    accountID,
    agentID,
    applicationID,
    beacon,
    errorBeacon,
    licenseKey,
    trustKey: trustKey || String(accountID),
  }
}

export function initNewRelicBrowser() {
  if (newRelicEnabled) {
    return
  }

  const config = getNewRelicConfig()

  if (!config) {
    return
  }

  newRelicEnabled = true

  const agent = new BrowserAgent({
    info: {
      applicationID: config.applicationID,
      beacon: config.beacon,
      errorBeacon: config.errorBeacon,
      licenseKey: config.licenseKey,
      sa: 1,
    },
    loader_config: {
      accountID: config.accountID,
      agentID: config.agentID,
      applicationID: config.applicationID,
      licenseKey: config.licenseKey,
      trustKey: config.trustKey,
    },
    init: {
      session_replay: { enabled: false },
      user_actions: { enabled: false },
      jserrors: { enabled: true },
      page_view_event: { enabled: true },
      page_view_timing: { enabled: true },
      session_trace: { enabled: false },
      soft_navigations: { enabled: false },
      generic_events: { enabled: false },
      logging: { enabled: false },
      obfuscate: TELEMETRY_OBFUSCATE_RULES.map((rule) => ({ ...rule })),
      ajax: {
        deny_list: ['*'],
      },
      distributed_tracing: {
        enabled: true,
      },
      privacy: {
        cookies_enabled: true,
      },
    },
  })

  startErrorReporting(agent)
}

function startErrorReporting(agent: BrowserAgent) {
  errorReportingAllowed = true
  agent.setErrorHandler((error: unknown) =>
    !errorReportingAllowed || typeof error !== 'object' || error === null || !sanitizedErrors.has(error))
  setErrorReporter((error, attributes) => {
    sanitizedErrors.add(error)
    agent.noticeError(error, attributes)
  })
  window.addEventListener('error', onWindowError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
}

function onWindowError(event: ErrorEvent) {
  reportError(event.error ?? event.message, 'window-error')
}

function onUnhandledRejection(event: PromiseRejectionEvent) {
  reportError(event.reason, 'unhandled-rejection')
}

// Revogação do consentimento: nada mais sai até recarregar a página.
export function stopNewRelicErrorReporting() {
  errorReportingAllowed = false
  setErrorReporter(null)
  window.removeEventListener('error', onWindowError)
  window.removeEventListener('unhandledrejection', onUnhandledRejection)
}

export function hasInitializedNewRelicBrowser() {
  return newRelicEnabled
}
