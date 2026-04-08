import { logger } from '../contentScript/utils/logger'

console.log('[Better Hasura History] Background script loaded')

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'COUNT') {
    console.log('background has received a message from popup, and count is ', request?.count)
  }

  if (request.type === 'BHH_DOWNLOAD_HISTORY') {
    const { json, filename } = request.data
    logger.debug('Processing download for:', filename)

    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`

    chrome.downloads.download(
      {
        url: dataUrl,
        saveAs: true,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          logger.error('Download failed:', new Error(chrome.runtime.lastError.message))
        } else {
          logger.debug('Download started with ID:', { downloadId })
        }
      },
    )
  }
})
