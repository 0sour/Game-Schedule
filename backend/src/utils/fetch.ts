import fetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'

const DEFAULT_TIMEOUT = 15000

function getAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
  return proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined
}

export async function fetchJSON(url: string, options?: Record<string, any>): Promise<any> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
  try {
    const agent = getAgent()
    const res = await fetch(url, { ...options, agent, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchText(url: string, options?: Record<string, any>): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
  try {
    const agent = getAgent()
    const res = await fetch(url, { ...options, agent, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchBuffer(url: string, options?: Record<string, any>): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
  try {
    const agent = getAgent()
    const res = await fetch(url, { ...options, agent, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}
