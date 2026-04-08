/**
 * This script is injected into the page context (MAIN world).
 * It interacts directly with Hasura's CodeMirror instances.
 */

console.debug('[BHH] script-injector.js loaded in MAIN world.')

window.addEventListener(
  'message',
  (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) {
      return
    }

    const { type, data } = event.data
    if (type === 'BHH_APPLY_HISTORY_ITEM') {
      const { operation, variables } = data

      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        const queryEditorEl = document.querySelector('.query-editor .CodeMirror')
        const variablesEditorEl = document.querySelector('.variable-editor .CodeMirror')

        if (queryEditorEl?.CodeMirror && variablesEditorEl && variablesEditorEl.CodeMirror) {
          clearInterval(interval)

          const queryEditor = queryEditorEl.CodeMirror
          const variablesEditor = variablesEditorEl.CodeMirror

          queryEditor.setValue(operation || '')
          variablesEditor.setValue(variables || '')
        } else if (attempts > 50) {
          clearInterval(interval)
          console.error('[Better Hasura History] Timed out waiting for CodeMirror instances.')
        }
      }, 100)
    } else if (type === 'BHH_PRETTIFY_VARIABLES') {
      const variablesEditorEl = document.querySelector('.variable-editor .CodeMirror')

      if (variablesEditorEl?.CodeMirror) {
        const editor = variablesEditorEl.CodeMirror
        const currentVal = editor.getValue()

        if (currentVal) {
          try {
            const parsed = JSON.parse(currentVal)
            const pretty = JSON.stringify(parsed, null, 2)
            editor.setValue(pretty)
          } catch (e) {
            console.error('[Better Hasura History] Failed to prettify variables:', e)
          }
        }
      }
    } else if (type === 'BHH_EXPORT_HISTORY') {
      const { json, filename } = data

      // Send to content script via postMessage, which will forward to background
      window.postMessage(
        {
          type: 'BHH_EXPORT_HISTORY_REQUEST',
          data: { json, filename },
        },
        '*',
      )
    } else if (type === 'BHH_GET_EDITOR_CONTENT') {
      const queryEditorEl = document.querySelector('.query-editor .CodeMirror')
      const variablesEditorEl = document.querySelector('.variable-editor .CodeMirror')

      if (
        queryEditorEl &&
        queryEditorEl.CodeMirror &&
        variablesEditorEl &&
        variablesEditorEl.CodeMirror
      ) {
        const queryEditor = queryEditorEl.CodeMirror
        const variablesEditor = variablesEditorEl.CodeMirror

        const operation = queryEditor.getValue() || ''
        const variables = variablesEditor.getValue() || ''

        // Try to find operation name in the string
        let operation_name = 'Unnamed Operation'
        const nameMatch = operation.match(/(?:query|mutation|subscription)\s+([a-zA-Z0-9_]+)/)
        if (nameMatch && nameMatch[1]) {
          operation_name = nameMatch[1]
        }

        window.postMessage(
          {
            type: 'BHH_EDITOR_CONTENT_RESPONSE',
            data: {
              operation,
              operation_name,
              variables,
            },
          },
          '*',
        )
      }
    } else if (type === 'BHH_GET_SQL_CONTENT') {
      const rawSqlEl = document.getElementById('raw_sql')

      if (rawSqlEl && window.ace) {
        let attempts = 0
        const interval = setInterval(() => {
          attempts++
          try {
            const aceEditor = window.ace.edit(rawSqlEl)
            if (aceEditor && aceEditor.getValue) {
              clearInterval(interval)

              const sql = aceEditor.getValue() || ''

              // Extract first line as operation name
              let operation_name = 'Unnamed SQL'
              const firstLine = sql.split('\n')[0].trim()
              if (firstLine) {
                // Truncate to 50 chars
                operation_name =
                  firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine
              }

              window.postMessage(
                {
                  type: 'BHH_SQL_CONTENT_RESPONSE',
                  data: {
                    sql,
                    operation_name,
                  },
                },
                '*',
              )
            }
          } catch {
            // Continue waiting
          }

          if (attempts > 50) {
            clearInterval(interval)
            console.error('[Better Hasura History] Timed out waiting for Ace editor.')
          }
        }, 100)
      }
    } else if (type === 'BHH_APPLY_SQL_HISTORY_ITEM') {
      const { sql } = data
      const rawSqlEl = document.getElementById('raw_sql')

      if (rawSqlEl && window.ace) {
        let attempts = 0
        const interval = setInterval(() => {
          attempts++
          try {
            const aceEditor = window.ace.edit(rawSqlEl)
            if (aceEditor && aceEditor.setValue) {
              clearInterval(interval)
              aceEditor.setValue(sql || '', -1)
            }
          } catch {
            // Continue waiting
          }

          if (attempts > 50) {
            clearInterval(interval)
            console.error('[Better Hasura History] Timed out waiting for Ace editor to set value.')
          }
        }, 100)
      }
    }
  },
  false,
)
