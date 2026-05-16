export interface IVueAppManager {
  initializeApps(buttonContainer: HTMLElement, paneContainer: HTMLElement): void
  injectSessionPane(apiBlock: HTMLElement): void
  removeSessionPane(): void
  injectBetterQuery(runButton: HTMLElement): void
  removeBetterQuery(): void
  cleanup(): void
  readonly initialized: boolean
}

export type PageType = 'graphiql' | 'sql' | 'unknown'

export interface INavigationManager {
  start(): void
  stop(): void
  getPageType(): PageType
}
