import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

import { getEnv } from '@/lib/env'
import * as schema from './schema'

let instance: NeonHttpDatabase<typeof schema> | undefined

export function getDb() {
  instance ??= drizzle(getEnv().DATABASE_URL, { schema })
  return instance
}
