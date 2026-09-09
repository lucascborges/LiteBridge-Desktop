import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { OrchestratorCanvas } from '../components/OrchestratorCanvas'
import { ProcessMonitorView } from '../components/ProcessMonitorView'
import { ModelRegistryView } from '../components/ModelRegistryView'
import { BackupsView } from '../components/BackupsView'

const renderWithClient = (ui: React.ReactElement) => {
  const testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
  )
}

describe('Frontend Suite - Mock-Free Dedicated Views', () => {
  it('renders Header with brand title and status pill', () => {
    renderWithClient(<Header onOpenDiagnostics={() => {}} />)
    expect(screen.getByText(/LiteBridge Desktop/i)).toBeTruthy()
    expect(screen.getByText(/v1.0.0-MVP/i)).toBeTruthy()
    expect(screen.getByText(/Diagnostics/i)).toBeTruthy()
  })

  it('renders Sidebar with harness list items', () => {
    renderWithClient(<Sidebar currentTab="orchestrator" setCurrentTab={() => {}} />)
    expect(screen.getByText(/Claude Code/i)).toBeTruthy()
    expect(screen.getByText(/Claude Desktop/i)).toBeTruthy()
    expect(screen.getByText(/LiteLLM Gateway Config/i)).toBeTruthy()
    expect(screen.getByText(/Model Registry & Aliases/i)).toBeTruthy()
    expect(screen.getByText(/Process Monitor/i)).toBeTruthy()
  })

  it('renders OrchestratorCanvas with dynamic role matrix', () => {
    renderWithClient(<OrchestratorCanvas />)
    expect(screen.getByText(/Model Role Routing Matrix/i)).toBeTruthy()
    expect(screen.getByText(/Claude Sonnet Target/i)).toBeTruthy()
    expect(screen.getByText(/No Global Pollution/i)).toBeTruthy()
  })

  it('renders ProcessMonitorView with live telemetry layout', () => {
    renderWithClient(<ProcessMonitorView />)
    expect(screen.getByText(/Subprocess Monitor/i)).toBeTruthy()
    expect(screen.getByText(/Refresh Processes/i)).toBeTruthy()
  })

  it('renders ModelRegistryView with alias creator', () => {
    renderWithClient(<ModelRegistryView />)
    expect(screen.getByText(/Model Registry & Aliases Studio/i)).toBeTruthy()
    expect(screen.getByText(/Create Model Route Alias/i)).toBeTruthy()
  })

  it('renders BackupsView with real clean empty state', () => {
    renderWithClient(<BackupsView />)
    expect(screen.getByText(/Config Backups & Atomic Rollbacks/i)).toBeTruthy()
    expect(screen.getByText(/AVAILABLE BACKUP SNAPSHOTS/i)).toBeTruthy()
  })

  it('switches languages dynamically across views (en, pt, es)', async () => {
    const { useAppStore } = await import('../store/useAppStore')
    
    // Switch to Portuguese
    useAppStore.getState().setLanguage('pt')
    const { unmount } = renderWithClient(<Header onOpenDiagnostics={() => {}} />)
    expect(screen.getByText(/Diagnósticos/i)).toBeTruthy()
    unmount()

    // Switch to Spanish
    useAppStore.getState().setLanguage('es')
    renderWithClient(<Header onOpenDiagnostics={() => {}} />)
    expect(screen.getByText(/Diagnósticos/i)).toBeTruthy()

    // Switch back to English
    useAppStore.getState().setLanguage('en')
  })
})
