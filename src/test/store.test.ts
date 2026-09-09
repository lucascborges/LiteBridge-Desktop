import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../store/useAppStore'

describe('Zustand useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      gatewayUrl: 'http://localhost:4000',
      apiKey: 'sk-litellm-virtual-team-key',
      maskedKey: 'sk-l***-key',
      selectedHarnessId: 'claude-code',
      mapping: {
        opus: 'bedrock/opus',
        sonnet: 'gemini-flash',
        haiku: 'claude-haiku',
        fallbackEnabled: true,
      },
    })
  })

  it('updates gateway URL properly', () => {
    useAppStore.getState().setGatewayUrl('http://127.0.0.1:8787')
    expect(useAppStore.getState().gatewayUrl).toBe('http://127.0.0.1:8787')
  })

  it('masks API key according to OWASP sensitive data standard', () => {
    useAppStore.getState().setApiKey('sk-ant-admin-secret-token-1234')
    expect(useAppStore.getState().apiKey).toBe('sk-ant-admin-secret-token-1234')
    expect(useAppStore.getState().maskedKey).toBe('sk-a***1234')
  })

  it('updates model role mappings dynamically', () => {
    useAppStore.getState().setMappingRole('sonnet', 'deepseek/deepseek-coder-v2.5')
    expect(useAppStore.getState().mapping.sonnet).toBe('deepseek/deepseek-coder-v2.5')
    expect(useAppStore.getState().mapping.opus).toBe('bedrock/opus')
  })

  it('manages context policy token boundaries', () => {
    useAppStore.getState().setMaxContextTokens(500000)
    useAppStore.getState().setCompactThreshold(85)
    expect(useAppStore.getState().contextPolicy.maxContextTokens).toBe(500000)
    expect(useAppStore.getState().contextPolicy.compactThresholdPercent).toBe(85)
  })
})
