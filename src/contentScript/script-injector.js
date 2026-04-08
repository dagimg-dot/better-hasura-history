/**
 * Injected into page context to interact with CodeMirror (GraphiQL) and Ace (SQL) editors.
 */

const EDITOR_SELECTORS = {
  query: '.query-editor .CodeMirror',
  variables: '.variable-editor .CodeMirror',
  sql: '#raw_sql',
}

const MESSAGE_TYPES = {
  GET_EDITOR_CONTENT: 'BHH_GET_EDITOR_CONTENT',
  EDITOR_CONTENT_RESPONSE: 'BHH_EDITOR_CONTENT_RESPONSE',
  GET_SQL_CONTENT: 'BHH_GET_SQL_CONTENT',
  SQL_CONTENT_RESPONSE: 'BHH_SQL_CONTENT_RESPONSE',
  APPLY_HISTORY_ITEM: 'BHH_APPLY_HISTORY_ITEM',
  APPLY_SQL_HISTORY_ITEM: 'BHH_APPLY_SQL_HISTORY_ITEM',
  PRETTIFY_VARIABLES: 'BHH_PRETTIFY_VARIABLES',
  EXPORT_HISTORY: 'BHH_EXPORT_HISTORY',
  EXPORT_REQUEST: 'BHH_EXPORT_HISTORY_REQUEST',
}

function getCodeMirrorEditor(selector) {
  const el = document.querySelector(selector)
  return el?.CodeMirror || null
}

function getAceEditor() {
  const el = document.getElementById('raw_sql')
  return el && window.ace ? window.ace.edit(el) : null
}

function extractOperationName(query, isSql = false) {
  if (isSql) {
    const firstLine = query.split('\n')[0].trim()
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine || 'Unnamed SQL'
  }
  const match = query.match(/(?:query|mutation|subscription)\s+([a-zA-Z0-9_]+)/)
  return match?.[1] || 'Unnamed Operation'
}

function waitForEditor(getEditor, timeout = 5000) {
  return new Promise((resolve) => {
    const start = Date.now()
    const interval = setInterval(() => {
      const editor = getEditor()
      if (editor) {
        clearInterval(interval)
        resolve(editor)
      } else if (Date.now() - start > timeout) {
        clearInterval(interval)
        resolve(null)
      }
    }, 100)
  })
}

window.addEventListener(
  'message',
  (event) => {
    if (event.source !== window) return

    const { type, data } = event.data

    if (type === MESSAGE_TYPES.GET_EDITOR_CONTENT) {
      waitForEditor(() => getCodeMirrorEditor(EDITOR_SELECTORS.query)).then((queryEditor) => {
        waitForEditor(() => getCodeMirrorEditor(EDITOR_SELECTORS.variables)).then(
          (variablesEditor) => {
            if (queryEditor && variablesEditor) {
              const operation = queryEditor.getValue() || ''
              const variables = variablesEditor.getValue() || ''
              const operation_name = extractOperationName(operation)

              window.postMessage(
                {
                  type: MESSAGE_TYPES.EDITOR_CONTENT_RESPONSE,
                  data: { operation, operation_name, variables },
                },
                '*',
              )
            }
          },
        )
      })
    }

    if (type === MESSAGE_TYPES.GET_SQL_CONTENT) {
      waitForEditor(getAceEditor).then((editor) => {
        if (editor) {
          const sql = editor.getValue() || ''
          const operation_name = extractOperationName(sql, true)

          window.postMessage(
            { type: MESSAGE_TYPES.SQL_CONTENT_RESPONSE, data: { sql, operation_name } },
            '*',
          )
        }
      })
    }

    if (type === MESSAGE_TYPES.APPLY_HISTORY_ITEM) {
      const { operation, variables } = data
      waitForEditor(() => getCodeMirrorEditor(EDITOR_SELECTORS.query)).then((queryEditor) => {
        waitForEditor(() => getCodeMirrorEditor(EDITOR_SELECTORS.variables)).then(
          (variablesEditor) => {
            if (queryEditor && variablesEditor) {
              queryEditor.setValue(operation || '')
              variablesEditor.setValue(variables || '')
            }
          },
        )
      })
    }

    if (type === MESSAGE_TYPES.APPLY_SQL_HISTORY_ITEM) {
      waitForEditor(getAceEditor).then((editor) => {
        if (editor) {
          editor.setValue(data.sql || '', -1)
        }
      })
    }

    if (type === MESSAGE_TYPES.PRETTIFY_VARIABLES) {
      waitForEditor(() => getCodeMirrorEditor(EDITOR_SELECTORS.variables)).then((editor) => {
        if (editor) {
          const value = editor.getValue()
          if (value) {
            try {
              editor.setValue(JSON.stringify(JSON.parse(value), null, 2))
            } catch {}
          }
        }
      })
    }

    if (type === MESSAGE_TYPES.EXPORT_HISTORY) {
      window.postMessage({ type: MESSAGE_TYPES.EXPORT_REQUEST, data }, '*')
    }
  },
  false,
)
