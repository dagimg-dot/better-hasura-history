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
  REFRESH_SCHEMA: 'BHH_REFRESH_SCHEMA',
  SCHEMA_REFRESHED: 'BHH_SCHEMA_REFRESHED',
  REFRESH_HEADERS: 'BHH_REFRESH_HEADERS',
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

var _bhhLogs = []
function _bhhLog() {
  var msg = '[Better Hasura Console] ' + Array.prototype.join.call(arguments, ' ')
  _bhhLogs.push(msg)
  if (_bhhLogs.length > 50) _bhhLogs.shift()
  console.log(msg)
}

function postSchemaRefreshed(success, methodOrError) {
  window.postMessage(
    { type: MESSAGE_TYPES.SCHEMA_REFRESHED, success: success, method: methodOrError },
    '*',
  )
}

/**
 * Refreshes the GraphQL schema via fetcher-patching + GraphiQL's _fetchSchema,
 * with a CWRP patch that preserves our schema through parent re-renders.
 *
 * KEY INSIGHTS:
 *   1. Cross-bundle instanceof issue — we can't build/push schema ourselves.
 *      Our graphql-js schema fails Hasura's codemirror-graphql instanceof checks.
 *      Solution: use Hasura's own _fetchSchema pipeline.
 *
 *   2. Schema revert on click — our _fetchSchema sets the schema, but Hasura's
 *      wrapper passes schema as a prop. On any parent re-render (click),
 *      GraphiQL's UNSAFE_componentWillReceiveProps overwrites state.schema
 *      with the parent's (stale) schema prop.
 *      Solution: patch GraphiQL's prototype CWRP to always inject our loaded
 *      schema into nextProps, preventing the parent's prop from taking effect.
 */
var _schemaRefreshing = false
var _cwrpPatched = false

function _patchGraphiQLCWRP(g) {
  if (_cwrpPatched) return
  var proto = g.constructor.prototype
  var origCWRP = proto.UNSAFE_componentWillReceiveProps || proto.componentWillReceiveProps
  if (!origCWRP) return

  proto.UNSAFE_componentWillReceiveProps = function (nextProps) {
    // Hasura's wrapper passes schema as a prop. On every parent re-render
    // (triggered by clicks), CWRP overwrites our freshly loaded schema with
    // the parent's stale schema. Fix: inject our current schema into nextProps,
    // overriding whatever the parent passed.
    if (this.state && this.state.schema) {
      var preserved = Object.assign({}, nextProps, { schema: this.state.schema })
      return origCWRP.call(this, preserved)
    }
    return origCWRP.call(this, nextProps)
  }

  _cwrpPatched = true
  _bhhLog('CWRP patched — schema preserved through parent re-renders')
}

function refreshSchema() {
  var g = window.g
  _bhhLog('Refreshing schema')

  if (typeof g?.props?.fetcher !== 'function') {
    postSchemaRefreshed(false, 'No fetcher')
    return
  }

  if (_schemaRefreshing) return
  _schemaRefreshing = true

  g.props
    .fetcher({ query: introspectionQuery, operationName: 'IntrospectionQuery' })
    .then(function (result) {
      if (!result || !result.data) {
        _bhhLog('Introspection: no data')
        _schemaRefreshing = false
        postSchemaRefreshed(false, 'no data')
        return
      }

      // Patch fetcher — only intercept IntrospectionQuery, pass everything else through
      var origFetcher = g.props.fetcher
      g.props.fetcher = function (params) {
        if (params && params.operationName === 'IntrospectionQuery') {
          return Promise.resolve(result)
        }
        return origFetcher(params)
      }

      // Restore original fetcher after 5s
      setTimeout(function () {
        g.props.fetcher = origFetcher
      }, 5000)

      // Install CWRP patch BEFORE calling _fetchSchema
      _patchGraphiQLCWRP(g)

      // Clear guard and trigger Hasura's schema pipeline
      g.state.schema = undefined
      g._fetchSchema()

      _bhhLog('Schema refreshed successfully')
      _schemaRefreshing = false
      postSchemaRefreshed(true, '_fetchSchema')
    })
    .catch(function (err) {
      _bhhLog('Introspection fetch error:', err && err.message ? err.message : String(err))
      _schemaRefreshing = false
      postSchemaRefreshed(false, err && err.message ? err.message : String(err))
    })
}

var introspectionQuery =
  'query IntrospectionQuery {' +
  '  __schema {' +
  '    queryType { name }' +
  '    mutationType { name }' +
  '    subscriptionType { name }' +
  '    types {' +
  '      ...FullType' +
  '    }' +
  '    directives {' +
  '      name description locations' +
  '      args { ...InputValueRef }' +
  '    }' +
  '  }' +
  '}' +
  'fragment FullType on __Type {' +
  '  kind name' +
  '  fields(includeDeprecated: true) { name args { ...InputValueRef } type { ...TypeRef } isDeprecated deprecationReason }' +
  '  inputFields { ...InputValueRef }' +
  '  interfaces { ...TypeRef }' +
  '  enumValues(includeDeprecated: true) { name isDeprecated deprecationReason }' +
  '  possibleTypes { ...TypeRef }' +
  '}' +
  'fragment InputValueRef on __InputValue {' +
  '  name type { ...TypeRef } defaultValue' +
  '}' +
  'fragment TypeRef on __Type {' +
  '  kind name' +
  '  ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } }' +
  '}'

window.addEventListener(
  'message',
  (event) => {
    if (event.source !== window) return

    const { type, data } = event.data

    if (type === MESSAGE_TYPES.REFRESH_SCHEMA) {
      refreshSchema()
    }

    if (type === MESSAGE_TYPES.REFRESH_HEADERS) {
      var _bhhCheckboxes = document.querySelectorAll('input[data-element-name="isActive"]')
      for (var _bhhI = 0; _bhhI < _bhhCheckboxes.length; _bhhI++) {
        var _bhhCb = _bhhCheckboxes[_bhhI]
        var _bhhRow = _bhhCb.closest('tr')
        if (!_bhhRow) continue
        var _bhhKeyInput = _bhhRow.querySelector('input[type="text"]')
        if (_bhhKeyInput && _bhhKeyInput.value.toLowerCase() === 'authorization') {
          if (!_bhhCb.checked) {
            _bhhCb.click()
          }
          break
        }
      }
    }

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
            } catch (e) {
              console.warn('[Better Hasura Console] Failed to prettify variables:', e)
            }
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
