import type { PageType } from '../services/NavigationManager'
import type { PageStrategy } from './PageStrategy'
import { GraphiQLStrategy } from './GraphiQLStrategy'
import { SqlStrategy } from './SqlStrategy'

export function createPageStrategy(pageType: PageType): PageStrategy {
  switch (pageType) {
    case 'graphiql':
      return new GraphiQLStrategy()
    case 'sql':
      return new SqlStrategy()
    default:
      throw new Error(`Unknown page type: ${pageType}`)
  }
}

export { GraphiQLStrategy, SqlStrategy }
export type { PageStrategy, EditorContent, SqlContent, ParsedContent } from './PageStrategy'
