import { EXTENSION_CONFIG } from '@/shared/constants'
import { RouteManager, type PageRoute } from './RouteManager'
import { logger } from '@/contentScript/utils/logger'

interface SearchInputCollector {
  selector: string
  routes: PageRoute[]
}

const SEARCH_INPUT_COLLECTORS: SearchInputCollector[] = [
  { selector: EXTENSION_CONFIG.DOM_SELECTORS.TABLE_SEARCH_INPUT, routes: ['data', 'sql'] },
  { selector: EXTENSION_CONFIG.DOM_SELECTORS.HISTORY_SEARCH_INPUT, routes: ['sql', 'api'] },
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

  blurAll(): void {
    const allInputs = this.getInputsForPage()
    for (const input of allInputs) {
      input.blur()
    }
    this.lastFocusedInput = null
  }
}
