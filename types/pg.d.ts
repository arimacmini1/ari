declare module "pg" {
  export interface QueryResult<T = any> {
    rows: T[]
    rowCount: number | null
  }

  export interface PoolClient {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>
    release(err?: Error | boolean): void
  }

  export class Pool {
    constructor(config?: Record<string, unknown>)
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>
    connect(): Promise<PoolClient>
    end(): Promise<void>
    on(event: "error", listener: (err: unknown) => void): this
  }
}
