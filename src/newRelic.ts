import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

let newRelicEnabled = false

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

  new BrowserAgent({
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
      ajax: {
        deny_list: [config.beacon],
      },
      distributed_tracing: {
        enabled: true,
      },
      privacy: {
        cookies_enabled: true,
      },
    },
  })
}
