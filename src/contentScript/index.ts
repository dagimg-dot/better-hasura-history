import { waitForElement } from './utils/waitForElement'
import BetterHasuraHistory from './main'
import { logger } from './utils/logger'

// Main function
;(async function () {
  try {
    logger.info('Initializing Better Hasura History...')
    const toolbar = await waitForElement('.toolbar')
    const graphiqlContainer = await waitForElement('.graphiql-container')
    const executeButton = await waitForElement('.execute-button')

    if (!toolbar || !graphiqlContainer || !executeButton) {
      logger.error('Could not find all required elements on the page. Aborting.')
      return
    }

    logger.info('All required elements found. Initializing Better Hasura History...')

    const betterHasuraHistory = new BetterHasuraHistory(toolbar, graphiqlContainer, executeButton)
    betterHasuraHistory.init()

    logger.info('Better Hasura History initialized successfully.')
  } catch (error) {
    logger.error('Initialization failed.', error)
  }
})()
