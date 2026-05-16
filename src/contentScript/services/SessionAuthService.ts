import { EXTENSION_CONFIG } from '@/shared/constants'
import { logger } from '@/contentScript/utils/logger'

const HEADERS_LS_KEY = EXTENSION_CONFIG.STORAGE_KEYS.GRAPHQL_HEADERS

interface HeaderEntry {
  key: string
  value: string
  isActive: boolean
  isNewHeader: boolean
  isDisabled?: boolean
}

function getGraphQLEndpoint(): string | null {
  const input = document.querySelector<HTMLInputElement>('#apiRequestBlock input[readonly]')
  return input?.value?.trim() || null
}

function readHeadersFromLS(): HeaderEntry[] {
  try {
    const raw = localStorage.getItem(HEADERS_LS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HeaderEntry[]
  } catch {
    return []
  }
}

function writeHeadersToLS(headers: HeaderEntry[]): void {
  localStorage.setItem(HEADERS_LS_KEY, JSON.stringify(headers))
}

function buildRequestHeaders(headers: HeaderEntry[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const h of headers) {
    if (h.isActive && h.key) {
      result[h.key] = h.value
    }
  }
  return result
}

function tokenPath(root: Record<string, any>): string | null {
  const possiblePaths = ['token', 'accessToken', 'access_token', 'jwt', 'authToken']
  for (const path of possiblePaths) {
    const val = root[path]
    if (typeof val === 'string' && val.length > 0) return val
  }
  for (const key of Object.keys(root)) {
    const val = root[key]
    if (typeof val === 'object' && val !== null) {
      const nested = tokenPath(val)
      if (nested) return nested
    }
  }
  return null
}

function findTokenInResponse(data: Record<string, any>): string | null {
  for (const key of Object.keys(data)) {
    const val = data[key]
    if (typeof val === 'object' && val !== null) {
      const result = tokenPath(val)
      if (result) return result
    }
  }
  return tokenPath(data)
}

function setAuthHeaderInLS(token: string): void {
  const headers = readHeadersFromLS()
  const existing = headers.findIndex(
    (h) => h.key.toLowerCase() === 'authorization' && !h.isNewHeader,
  )

  if (existing >= 0) {
    headers[existing] = {
      ...headers[existing],
      value: `Bearer ${token}`,
      isActive: true,
      isDisabled: false,
    }
  } else {
    const insertAfter = headers.findIndex((h) => h.key.toLowerCase() === 'content-type')
    const newHeader: HeaderEntry = {
      key: 'Authorization',
      value: `Bearer ${token}`,
      isActive: true,
      isNewHeader: false,
      isDisabled: false,
    }
    headers.splice(insertAfter >= 0 ? insertAfter + 1 : 1, 0, newHeader)
  }

  writeHeadersToLS(headers)
}

export const SessionAuthService = {
  async authenticate(
    mutation: string,
    variables: Record<string, any>,
  ): Promise<{ token: string; rawData: Record<string, any> }> {
    const endpoint = getGraphQLEndpoint()
    if (!endpoint) {
      throw new Error('GraphQL endpoint not found on the page')
    }

    const headers = readHeadersFromLS()
    const reqHeaders = buildRequestHeaders(headers)
    reqHeaders['Content-Type'] = 'application/json'

    logger.debug('SessionAuth: sending authentication mutation', {
      endpoint,
      mutationPreview: mutation.substring(0, 80),
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 500)}`)
    }

    const json = await response.json()

    if (json.errors && json.errors.length > 0) {
      const msgs = json.errors.map((e: any) => e.message).join('; ')
      throw new Error(`GraphQL error: ${msgs}`)
    }

    const data = json.data || {}
    const token = findTokenInResponse(data)

    if (!token) {
      logger.warn('SessionAuth: no token found in response', { data })
      throw new Error(
        'Could not find authentication token in the response. Check the Customize Operation mutation.',
      )
    }

    setAuthHeaderInLS(token)

    logger.info('SessionAuth: authentication successful, token set in headers')
    return { token, rawData: data }
  },

  async sendRequest(
    mutation: string,
    variables: Record<string, any>,
  ): Promise<{ data: Record<string, any>; token: string | null }> {
    const endpoint = getGraphQLEndpoint()
    if (!endpoint) {
      throw new Error('GraphQL endpoint not found on the page')
    }

    const headers = readHeadersFromLS()
    const reqHeaders = buildRequestHeaders(headers)
    reqHeaders['Content-Type'] = 'application/json'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 500)}`)
    }

    const json = await response.json()

    if (json.errors && json.errors.length > 0) {
      const msgs = json.errors.map((e: any) => e.message).join('; ')
      throw new Error(`GraphQL error: ${msgs}`)
    }

    const rawData = json.data || {}
    const token = findTokenInResponse(rawData)

    if (token) {
      setAuthHeaderInLS(token)
    }

    return { data: rawData, token }
  },
}
