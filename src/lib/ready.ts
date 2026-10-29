// 앱 기동 상태. instrumentation.ts가 서버 시작 때 startApp()을 부르고,
// 화면·API는 ensureReady()로 스키마·시드가 끝났는지 기다린다. /__health는 readyState()로 200·503을 가른다.

import { ensureSchemaAndSeed } from './seed'

type ReadyState = 'starting' | 'ready' | 'failed'

declare global {
  var __neulReady: Promise<void> | undefined
  var __neulReadyState: ReadyState | undefined
  var __neulReadyError: string | undefined
}

/** next build 중에는 DB가 없으므로 스키마·시드를 돌리지 않는다. */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

export function startApp(): Promise<void> {
  if (isBuildPhase()) return Promise.resolve()
  if (!globalThis.__neulReady) {
    globalThis.__neulReadyState = 'starting'
    globalThis.__neulReady = ensureSchemaAndSeed().then(
      () => {
        globalThis.__neulReadyState = 'ready'
      },
      (err: unknown) => {
        globalThis.__neulReadyState = 'failed'
        globalThis.__neulReadyError = err instanceof Error ? err.message : String(err)
        console.error('[startup] 스키마·시드 실패:', err)
        // 실패를 붙잡아 두지 않는다. 다음 요청이 다시 시도하게 한다(다른 서버가 시드를 넣는 중이었을 수 있다).
        globalThis.__neulReady = undefined
        throw err
      },
    )
  }
  return globalThis.__neulReady
}

export async function ensureReady(): Promise<void> {
  await startApp()
}

export function readyState(): { state: ReadyState; error?: string } {
  return { state: globalThis.__neulReadyState ?? 'starting', error: globalThis.__neulReadyError }
}
