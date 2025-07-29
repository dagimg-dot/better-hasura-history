/**
 * Waits for an element to appear in the DOM.
 * @param selector The CSS selector of the element.
 * @param timeout The maximum time to wait in milliseconds.
 * @returns A promise that resolves with the element, or null if it times out.
 */
const waitForElement = (selector: string, timeout = 15000): Promise<Element | null> => {
  return new Promise((resolve) => {
    const el = document.querySelector(selector)
    if (el) {
      resolve(el)
      return
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) {
        observer.disconnect()
        resolve(el)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

export { waitForElement }
