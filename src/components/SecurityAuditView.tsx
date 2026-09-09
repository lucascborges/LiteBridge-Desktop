import React from 'react'
import { Shield, CheckCircle2, Lock, Terminal, FileCode, Cpu } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'

export const SecurityAuditView: React.FC = () => {
  const { t } = useTranslation()

  const checklist = [
    {
      owasp: 'A01:2021 - Broken Access Control',
      title: 'Isolamento de Processo & Zero Shell Pollution',
      desc: 'Variáveis de ambiente injetadas estritamente em runtime do subprocesso spawnado sem tocar em profiles globais (~/.zshrc, ~/.bashrc, PowerShell profiles).',
      status: 'MITIGATED',
      icon: Lock,
    },
    {
      owasp: 'A02:2021 - Cryptographic Failures',
      title: 'Proteção de API Keys & Tokens Mascarados',
      desc: 'UI mascara chaves de autenticação com padrão prefix***suffix. Proibição expressa de registrar chaves e tokens de modelo em logs de texto simples.',
      status: 'MITIGATED',
      icon: Shield,
    },
    {
      owasp: 'A03:2021 - Injection (Command Injection)',
      title: 'Vetores de Argumentos e Sanitização de Comandos',
      desc: 'Sem concatenação de strings em shells arbitrários; uso de Command::new("cmd").args(&[...]) no Rust e sanitização estrita de quebras de linha e caracteres nulos.',
      status: 'MITIGATED',
      icon: Terminal,
    },
    {
      owasp: 'A04:2021 - Insecure Design',
      title: 'Princípio de Menor Privilégio & Sandbox',
      desc: 'Design arquitetural modular onde comandos Tauri expostos são estritamente delimitados por schema de tipos e permissões explícitas do Tauri v2.',
      status: 'MITIGATED',
      icon: Cpu,
    },
    {
      owasp: 'A08:2021 - Software and Data Integrity Failures',
      title: 'Backup Atômico e Validação de Schema JSON',
      desc: 'Gravação em disco de arquivos de configuração usando escrita em arquivo temporário (.tmp) seguido de rename atômico e criação de cópia .bak.<timestamp>.',
      status: 'MITIGATED',
      icon: FileCode,
    },
    {
      owasp: 'A10:2021 - Server-Side Request Forgery (SSRF)',
      title: 'Validação Estrita de URL do Gateway',
      desc: 'Parser de URL com validação de esquema (apenas http/https), validação de host e saneamento de trailing slashes antes de requisições HTTP do client.',
      status: 'MITIGATED',
      icon: Shield,
    },
  ]

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl bg-[#1c1b1d] p-5 border border-[#27272a] shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#201f22] border border-[#27272a] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#10b981]" />
          </div>
          <div>
            <h2 className="text-lg text-[#e5e1e4] font-semibold">
              {t('securityAuditTitle')}
            </h2>
            <p className="text-xs text-[#bbcabf]">
              {t('securityAuditDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {checklist.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.owasp}
              className="p-4 rounded-xl bg-[#0e0e10] border border-[#27272a] hover:border-[#10b981]/40 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs text-[#4cd7f6]">
                  <Icon className="w-4 h-4 text-[#10b981]" />
                  <span className="font-semibold">{item.owasp}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981] font-mono text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {item.status}
                </span>
              </div>
              <h3 className="text-sm text-[#e5e1e4] font-medium">{item.title}</h3>
              <p className="text-xs text-[#bbcabf] leading-relaxed">{item.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
