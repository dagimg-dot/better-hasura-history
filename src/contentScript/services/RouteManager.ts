export type PageRoute = 'data' | 'sql' | 'graphql' | 'unknown'

export interface PageInfo {
  route: PageRoute
  path: string
}

export class RouteManager {
  static detectPage(path: string): PageRoute {
    if (path.includes('/console/data/sql')) {
      return 'sql'
    }
    if (path.startsWith('/console/data')) {
      return 'data'
    }
    if (
      path.includes('/console/api') ||
      path.includes('/api-explorer') ||
      path.endsWith('/console/') ||
      path === '/'
    ) {
      return 'graphql'
    }
    return 'unknown'
  }

  static getPageInfo(): PageInfo {
    return {
      route: this.detectPage(window.location.pathname),
      path: window.location.pathname,
    }
  }

  static isKnownPage(): boolean {
    return this.detectPage(window.location.pathname) !== 'unknown'
  }
}
