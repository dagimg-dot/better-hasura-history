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

/**
 * Debug helper — logs to console with extension prefix and stores the last N entries
 * so the user can inspect them.
 */
var _bhhLogs = []
function _bhhLog() {
  var msg = '[Better Hasura Console] ' + Array.prototype.join.call(arguments, ' ')
  _bhhLogs.push(msg)
  if (_bhhLogs.length > 50) _bhhLogs.shift()
  console.log(msg)
}

function postSchemaRefreshed(method) {
  window.postMessage(
    { type: MESSAGE_TYPES.SCHEMA_REFRESHED, success: true, method: method },
    '*',
  )
}

/**
 * Pushes a new GraphQLSchema into the CodeMirror GraphQL editor.
 *
 * IMPORTANT: Mutates the existing lint option's schema property in-place instead
 * of replacing the entire lint option. CodeMirror's lint addon finds the lint
 * function via a mode-based helper registration (from codemirror-graphql).
 * Replacing the lint option with cm.setOption() would destroy that reference.
 */
function pushSchemaToCodeMirror(schema) {
  var cm = getCodeMirrorEditor('.query-editor .CodeMirror')
  if (!cm) return

  var lintOpt = cm.getOption('lint')
  if (lintOpt) {
    lintOpt.schema = schema
  } else {
    cm.setOption('lint', { schema: schema })
  }
  cm.setOption('hintOptions', { schema: schema })

  // Clear existing lint marks
  var lintState = cm.state?.lint
  if (lintState && lintState.marked) {
    for (var i = 0; i < lintState.marked.length; i++) lintState.marked[i].clear()
    lintState.marked = []
  }
  if (typeof cm.clearGutter === 'function') {
    cm.clearGutter('CodeMirror-lint-markers')
    cm.clearGutter('CodeMirror-lint-gutter')
  }
  // Strip lint classes from editor spans
  var cmEl = cm.getWrapperElement()
  if (cmEl) {
    var lintSpans = cmEl.querySelectorAll('span[class*="lint"]')
    for (var j = 0; j < lintSpans.length; j++) {
      lintSpans[j].className = lintSpans[j].className
        .replace(/\bCodeMirror-lint-mark-\w+\b/g, '')
        .replace(/\bcm-lint-mark-\w+\b/g, '')
        .trim()
    }
  }

  if (typeof cm.performLint === 'function') cm.performLint()
  _bhhLog('Schema refreshed — pushed to CodeMirror, performLint called')
}

/**
 * Primary schema refresh strategy for GraphiQL v1 (Hasura Console).
 *
 * GraphiQL v1's _fetchSchema() has a guard: `if (this.state.schema !== undefined) { return; }`
 * It only builds the schema ONCE (first load). After that, every call fires introspection
 * but bails out because schema is already set.
 *
 * This function:
 *  1. Saves the old schema ref and clears state.schema (to pass the guard)
 *  2. Monkey-patches setState to intercept the 4 immediate old-schema restore calls
 *     (from GraphiQL's _storage mechanism) that would otherwise reset the guard
 *     before the async introspection resolves
 *  3. Calls _fetchSchema() which now builds a fresh schema
 *  4. Polls for the captured new schema, pushes it to CodeMirror
 */
function refreshSchemaViaFetchSchema() {
  var g = window.g
  _bhhLog('Refreshing schema via _fetchSchema (guard bypass)')

  var oldSchemaRef = g.state.schema
  var oldTypeCount = oldSchemaRef ? Object.keys(oldSchemaRef._typeMap || {}).length : 0

  // 1. Clear schema so _fetchSchema's guard passes
  g.state.schema = undefined

  // 2. Monkey-patch setState to block old-schema restores
  var origSetState = g.setState.bind(g)
  var capturedSchema = null

  g.setState = function (partial) {
    if (partial && typeof partial === 'object' && 'schema' in partial && partial.schema) {
      if (partial.schema === oldSchemaRef) {
        // GraphiQL's _storage is trying to restore the old schema.
        // Strip it so this.state.schema stays undefined for the guard.
        partial = Object.assign({}, partial)
        delete partial.schema
      } else {
        // Genuinely new schema from _fetchSchema's setState call
        capturedSchema = partial.schema
      }
    }
    origSetState(partial)
  }

  // 3. Fire introspection
  g._fetchSchema()

  // 4. Poll for captured new schema
  var pollCount = 0
  var pollTimer = setInterval(function () {
    pollCount++
    if (capturedSchema && capturedSchema !== oldSchemaRef) {
      clearInterval(pollTimer)
      var newTypeCount = Object.keys(capturedSchema._typeMap || {}).length
      _bhhLog(
        'Schema captured after ' + (pollCount * 200) + 'ms',
        '(types: ' + oldTypeCount + ' → ' + newTypeCount + ')',
      )
      pushSchemaToCodeMirror(capturedSchema)
      g.setState = origSetState
      postSchemaRefreshed('_fetchSchema')
      return
    }
    if (pollCount > 75) {
      clearInterval(pollTimer)
      _bhhLog('Schema refresh timed out (15s)')
      // Fallback: force a CM re-lint
      var cm = getCodeMirrorEditor('.query-editor .CodeMirror')
      if (cm && typeof cm.performLint === 'function') cm.performLint()
      g.setState = origSetState
      postSchemaRefreshed('_fetchSchema (timeout)')
    }
  }, 200)
}

/**
 * Fallback: runs introspection directly via the GraphiQL fetcher and pushes
 * the result to CodeMirror + React state. Only used when _fetchSchema isn't
 * available on the GraphiQL instance.
 */
function runIntrospectionViaFetcher(fetcher) {
  _bhhLog('Running introspection via fetcher')

  fetcher({ query: introspectionQuery, operationName: 'IntrospectionQuery' })
    .then(function (result) {
      if (!result || !result.data) {
        _bhhLog('Introspection via fetcher: no data in result')
        return
      }
      // Try to find buildClientSchema from whichever global
      var buildSchema = window.graphql?.buildClientSchema
        || window.GraphQL?.buildClientSchema
        || window.buildClientSchema

      if (typeof buildSchema !== 'function') {
        _bhhLog('Introspection via fetcher: buildClientSchema not found in globals')
        return
      }

      var schema = buildSchema(result.data)
      if (!schema) return

      // Push into CodeMirror
      var cm = getCodeMirrorEditor('.query-editor .CodeMirror')
      if (cm) {
        var lintOpt = cm.getOption('lint')
        if (lintOpt) { lintOpt.schema = schema } else { cm.setOption('lint', { schema: schema }) }
        cm.setOption('hintOptions', { schema: schema })
        if (typeof cm.performLint === 'function') cm.performLint()
      }
      // Also update GraphiQL state
      if (window.g && typeof window.g.setState === 'function') {
        window.g.setState({ schema: schema })
      }
      _bhhLog('Schema refreshed via fetcher introspection')
      postSchemaRefreshed('fetcher-introspect')
    })
    .catch(function (err) {
      _bhhLog('Introspection via fetcher error:', err.message || String(err))
    })
}

/**
 * Triggers a GraphQL schema refresh. Tries strategies in order:
 *   1. _fetchSchema guard bypass (GraphiQL v1 class component)
 *   2. fetcher introspection fallback
 */
function refreshSchema() {
  if (typeof window.g?._fetchSchema === 'function') {
    refreshSchemaViaFetchSchema()
    return
  }
  // Fallback
  if (typeof window.g?.props?.fetcher === 'function') {
    runIntrospectionViaFetcher(window.g.props.fetcher)
    return
  }
      _bhhLog('No schema refresh strategy available')
  window.postMessage(
    { type: MESSAGE_TYPES.SCHEMA_REFRESHED, success: false, error: 'No refresh strategy available' },
    '*',
  )
}

var introspectionQuery =
  'query IntrospectionQuery {\n' +
  '  __schema {\n' +
  '    queryType { name }\n' +
  '    mutationType { name }\n' +
  '    subscriptionType { name }\n' +
  '    types {\n' +
  '      ...FullType\n' +
  '    }\n' +
  '    directives {\n' +
  '      name\n' +
  '      description\n' +
  '      locations\n' +
  '      args { ...InputValueRef }\n' +
  '    }\n' +
  '  }\n' +
  '}\n' +
  'fragment FullType on __Type {\n' +
  '  kind\n' +
  '  name\n' +
  '  fields(includeDeprecated: true) {\n' +
  '    name\n' +
  '    args { ...InputValueRef }\n' +
  '    type { ...TypeRef }\n' +
  '    isDeprecated\n' +
  '    deprecationReason\n' +
  '  }\n' +
  '  inputFields { ...InputValueRef }\n' +
  '  interfaces { ...TypeRef }\n' +
  '  enumValues(includeDeprecated: true) { name isDeprecated deprecationReason }\n' +
  '  possibleTypes { ...TypeRef }\n' +
  '}\n' +
  'fragment InputValueRef on __InputValue {\n' +
  '  name\n' +
  '  type { ...TypeRef }\n' +
  '  defaultValue\n' +
  '}\n' +
  'fragment TypeRef on __Type {\n' +
  '  kind\n' +
  '  name\n' +
  '  ofType {\n' +
  '    kind\n' +
  '    name\n' +
  '    ofType {\n' +
  '      kind\n' +
  '      name\n' +
  '      ofType { kind name ofType { kind name ofType { kind name } } }\n' +
  '    }\n' +
  '  }\n' +
  '}'

window.addEventListener(
  'message',
  (event) => {
    if (event.source !== window) return

    const { type, data } = event.data

    if (type === MESSAGE_TYPES.REFRESH_SCHEMA) {
      refreshSchema()
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
