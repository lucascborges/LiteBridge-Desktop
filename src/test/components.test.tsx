import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { OrchestratorCanvas } from '../components/OrchestratorCanvas'

const renderWithClient = (ui: React.ReactElement) => {
  const testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
  )
}

describe('Frontend Component Suite', () => {
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
  })

  it('renders OrchestratorCanvas with model routing matrix and spawner buttons', () => {
    renderWithClient(<OrchestratorCanvas />)
    expect(screen.getByText(/Model Role Routing Matrix/i)).toBeTruthy()
    expect(screen.getByText(/Claude Sonnet Target/i)).toBeTruthy()
    expect(screen.getByText(/Terminal Spawner/i)).toBeTruthy()
    expect(screen.getByText(/No Global Pollution/i)).toBeTruthy()
  })
})
