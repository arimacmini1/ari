import { createOrchestratorEngine, type OrchestratorEngine } from '@/lib/orchestrator-engine';

declare global {
  var __aei_orchestrator_engine: OrchestratorEngine | undefined;
}

export function getOrchestratorEngine(): OrchestratorEngine {
  if (!globalThis.__aei_orchestrator_engine) {
    globalThis.__aei_orchestrator_engine = createOrchestratorEngine();
  }
  return globalThis.__aei_orchestrator_engine;
}
