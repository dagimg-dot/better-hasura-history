// This script runs in the main world context of the page.
// It has access to the page's window object and JS variables.

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

      // This is the same logic as before, but now running in the correct context
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        const queryEditorEl = document.querySelector('.query-editor .CodeMirror')
        const variablesEditorEl = document.querySelector('.variable-editor .CodeMirror')

        if (
          queryEditorEl &&
          queryEditorEl.CodeMirror &&
          variablesEditorEl &&
          variablesEditorEl.CodeMirror
        ) {
          clearInterval(interval)

          const queryEditor = queryEditorEl.CodeMirror
          const variablesEditor = variablesEditorEl.CodeMirror

          queryEditor.setValue(operation || '')

          let finalVariables = variables || ''
          // TODO: Might enable this in the future
          // if (finalVariables) {
          //   try {
          //     const parsed = JSON.parse(finalVariables)
          //     finalVariables = JSON.stringify(parsed, null, 2)
          //   } catch (e) {
          //     console.error('[Better Hasura History] Error parsing variables:', e)
          //   }
          // }
          variablesEditor.setValue(finalVariables)
        } else if (attempts > 50) {
          // Timeout after 5 seconds
          clearInterval(interval)
          console.error('[Better Hasura History] Timed out waiting for CodeMirror instances.')
        }
      }, 100)
    }
  },
  false,
)
