import type { HistoryEntry } from './types'

type ParsedQuery = Omit<HistoryEntry, 'id' | 'createdAt'>

/**
 * Parse a CodeMirror HTML into a JSON-friendly structure.
 */
function parseCodeMirrorHtml(): ParsedQuery | null {
  const editors = document.querySelectorAll('.CodeMirror-code')
  if (editors.length < 2) {
    return null
  }

  const operationEditor = editors[0]
  const variablesEditor = editors[1]

  const operationLines = Array.from(operationEditor.querySelectorAll(':scope > div'))
  let operation = ''
  let operation_name = ''

  for (const line of operationLines) {
    const lineText = (line.querySelector('pre.CodeMirror-line') as HTMLElement)?.innerText
    if (lineText) {
      operation += lineText + '\n'
      const nameMatch = lineText.match(/(?:query|mutation)\s+([a-zA-Z0-9_]+)/)
      if (nameMatch && nameMatch[1]) {
        operation_name = nameMatch[1]
      }
    }
  }

  operation = operation.replace(/\u200B/g, '').trim()
  if (!operation) return null

  const variableLines = Array.from(variablesEditor.querySelectorAll(':scope > div'))
  let variables = ''
  for (const line of variableLines) {
    const lineText = (line.querySelector('pre.CodeMirror-line') as HTMLElement)?.innerText
    if (lineText) {
      variables += lineText + '\n'
    }
  }

  variables = variables.replace(/\u200B/g, '').trim()

  return { operation, operation_name: operation_name || 'Unnamed Operation', variables }
}

export { parseCodeMirrorHtml }
