// Registra o deploy de producao no Change Tracking do New Relic (marcador "Deployments" do app Browser).
// Nunca bloqueia o deploy: sem configuracao, ou se a NerdGraph falhar, so avisa e sai com 0.
// A chave (User key NRAK-...) nunca e impressa.
import { pathToFileURL } from 'node:url';

const ENDPOINTS = { US: 'https://api.newrelic.com/graphql', EU: 'https://api.eu.newrelic.com/graphql' };
export const MUTATION = `mutation($deployment: ChangeTrackingDeploymentInput!) {
  changeTrackingCreateDeployment(deployment: $deployment) { deploymentId entityGuid } }`;

// GUID de entidade do New Relic: base64("<conta>|BROWSER|APPLICATION|<applicationID>").
export function browserEntityGuid(accountId, applicationId) {
  if (!/^\d+$/.test(accountId ?? '') || !/^\d+$/.test(applicationId ?? '')) {
    throw new Error('VITE_NEW_RELIC_ACCOUNT_ID e VITE_NEW_RELIC_APPLICATION_ID devem ser numericos.');
  }
  return Buffer.from(`${accountId}|BROWSER|APPLICATION|${applicationId}`).toString('base64').replace(/=+$/, '');
}

export function deploymentInput(env) {
  const sha = env.GITHUB_SHA ?? '';
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('GITHUB_SHA ausente ou invalido.');
  const deployment = {
    entityGuid: browserEntityGuid(env.VITE_NEW_RELIC_ACCOUNT_ID, env.VITE_NEW_RELIC_APPLICATION_ID),
    version: sha.slice(0, 7),
    commit: sha,
    deploymentType: 'BASIC',
    description: 'Producao: front publicado no Azure Static Web Apps',
  };
  if (env.GITHUB_ACTOR) deployment.user = env.GITHUB_ACTOR;
  if (env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID) {
    deployment.deepLink = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  }
  return deployment;
}

export async function recordDeployment(env, fetchImpl = fetch, log = console.log) {
  const apiKey = (env.NEW_RELIC_API_KEY ?? '').trim();
  if (!apiKey || !env.VITE_NEW_RELIC_ACCOUNT_ID || !env.VITE_NEW_RELIC_APPLICATION_ID) {
    log('::notice::Marcador de deploy no New Relic nao registrado: defina NEW_RELIC_API_KEY e as variaveis VITE_NEW_RELIC_ACCOUNT_ID/APPLICATION_ID.');
    return 0;
  }
  try {
    const region = (env.NEW_RELIC_REGION ?? '').trim().toUpperCase() || 'US';
    if (!ENDPOINTS[region]) throw new Error('NEW_RELIC_REGION deve ser US ou EU.');
    const response = await fetchImpl(ENDPOINTS[region], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'API-Key': apiKey, 'User-Agent': 'hemodinks-front-deploy' },
      body: JSON.stringify({ query: MUTATION, variables: { deployment: deploymentInput(env) } }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`NerdGraph HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.errors?.length) throw new Error(`NerdGraph: ${payload.errors.map(e => e.message).join('; ').slice(0, 500)}`);
    log(`Deploy registrado no New Relic (deploymentId ${payload.data.changeTrackingCreateDeployment.deploymentId}).`);
  } catch (error) {
    log(`::warning::Marcador de deploy no New Relic nao registrado: ${error?.message ?? 'erro desconhecido'}`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await recordDeployment(process.env);
}
