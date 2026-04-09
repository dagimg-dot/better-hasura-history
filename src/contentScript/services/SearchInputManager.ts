import { RouteManager, type PageRoute } from './RouteManager'
import { logger } from '../utils/logger'

interface SearchInputCollector {
  selector: string
  routes: PageRoute[]
}

const SEARCH_INPUT_COLLECTORS: SearchInputCollector[] = [
  { selector: '.table-search-container input', routes: ['data', 'sql'] },
  { selector: '.history-search-container input', routes: ['sql', 'graphql'] },
]

export class SearchInputManager {
  private lastFocusedInput: HTMLInputElement | null = null

  getInputsForPage(): HTMLInputElement[] {
    const pageInfo = RouteManager.getPageInfo()
    const inputs: HTMLInputElement[] = []

    for (const collector of SEARCH_INPUT_COLLECTORS) {
      if (collector.routes.includes(pageInfo.route)) {
        const elements = document.querySelectorAll<HTMLInputElement>(collector.selector)
        inputs.push(...Array.from(elements))
      }
    }

    return inputs
  }

  private filterVisibleInputs(inputs: HTMLInputElement[]): HTMLInputElement[] {
    return inputs.filter((input) => {
      const style = window.getComputedStyle(input)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
  }

  focus(): void {
    const allInputs = this.getInputsForPage()
    if (allInputs.length === 0) {
      logger.debug('No search inputs found for current page')
      return
    }

    const visibleInputs = this.filterVisibleInputs(allInputs)
    if (visibleInputs.length === 0) {
      logger.debug('No visible search inputs found')
      return
    }

    let nextIndex = 0
    if (this.lastFocusedInput && visibleInputs.includes(this.lastFocusedInput)) {
      const currentIndex = visibleInputs.indexOf(this.lastFocusedInput)
      nextIndex = (currentIndex + 1) % visibleInputs.length
    }

    this.lastFocusedInput = visibleInputs[nextIndex]
    this.lastFocusedInput.focus()
    this.lastFocusedInput.select()
  }
}
