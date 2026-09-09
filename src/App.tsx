import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { OrchestratorCanvas } from './components/OrchestratorCanvas'
import { GatewayConfigView } from './components/GatewayConfigView'
import { BackupsView } from './components/BackupsView'
import { IpcLogsView } from './components/IpcLogsView'
import { SecurityAuditView } from './components/SecurityAuditView'
import { useSystemScanner, useLiteLLMModels } from './hooks/useTauriBridge'

export function App() {
  const [currentTab, setCurrentTab] = useState('orchestrator')

  // Inicia detecção automática do sistema e busca inicial de modelos
  useSystemScanner()
  useLiteLLMModels()

  useEffect(() => {
    document.title = 'LiteBridge Desktop - Orchestrator'
  }, [])

  return (
    <div className="min-h-screen bg-[#131315] text-[#e5e1e4] antialiased select-none font-sans">
      <Header onOpenDiagnostics={() => setCurrentTab('ipc-logs')} />
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <div className="pl-64">
        <main className="pt-[38px] min-h-screen px-6 py-4 w-full">
          {currentTab === 'orchestrator' && <OrchestratorCanvas />}
          {currentTab === 'gateway-config' && <GatewayConfigView />}
          {currentTab === 'model-registry' && <OrchestratorCanvas />}
          {currentTab === 'process-monitor' && <OrchestratorCanvas />}
          {currentTab === 'backups' && <BackupsView />}
          {currentTab === 'security-owasp' && <SecurityAuditView />}
          {currentTab === 'ipc-logs' && <IpcLogsView />}
        </main>
      </div>
    </div>
  )
}

export default App
