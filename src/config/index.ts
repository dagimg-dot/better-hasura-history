import { developmentConfig } from './development'
import { productionConfig } from './production'

const isDevelopment = import.meta.env.DEV

export const config = isDevelopment ? developmentConfig : productionConfig

export type Config = typeof config
