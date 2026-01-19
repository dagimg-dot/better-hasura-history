export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>,
  ) {
    super(message)
    this.name = 'ExtensionError'
  }
}

export class VueAppError extends ExtensionError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VUE_APP_ERROR', context)
    this.name = 'VueAppError'
  }
}

export class DOMError extends ExtensionError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DOM_ERROR', context)
    this.name = 'DOMError'
  }
}

export class StorageError extends ExtensionError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'STORAGE_ERROR', context)
    this.name = 'StorageError'
  }
}
