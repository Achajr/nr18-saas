type QueryResponse = {
  data: any
  error: { message: string } | null
  count?: number | null
}

type Filter = { op: 'eq' | 'neq' | 'gte' | 'lte' | 'in'; field: string; value: any }

class LocalQuery {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: any
  private filters: Filter[] = []
  private orFilters: Filter[][] = []
  private orderBy?: { field: string; ascending?: boolean }
  private limitValue?: number
  private singleValue = false
  private countValue?: 'exact'
  private headValue?: boolean

  constructor(private table: string) {}

  select(_columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    void _columns
    this.action = this.action || 'select'
    this.countValue = options?.count
    this.headValue = options?.head
    return this
  }

  insert(payload: any) {
    this.action = 'insert'
    this.payload = payload
    return this
  }

  update(payload: any) {
    this.action = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  eq(field: string, value: any) {
    this.filters.push({ op: 'eq', field, value })
    return this
  }

  neq(field: string, value: any) {
    this.filters.push({ op: 'neq', field, value })
    return this
  }

  gte(field: string, value: any) {
    this.filters.push({ op: 'gte', field, value })
    return this
  }

  lte(field: string, value: any) {
    this.filters.push({ op: 'lte', field, value })
    return this
  }

  in(field: string, value: any[]) {
    this.filters.push({ op: 'in', field, value })
    return this
  }

  or(expression: string) {
    const group = expression
      .split(',')
      .map(part => {
        const match = part.match(/^([a-zA-Z0-9_]+)\.in\.\((.*)\)$/)
        if (!match) return null
        return { op: 'in' as const, field: match[1], value: match[2].split(',').filter(Boolean) }
      })
      .filter(Boolean) as Filter[]
    if (group.length) this.orFilters.push(group)
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderBy = { field, ascending: options?.ascending }
    return this
  }

  limit(value: number) {
    this.limitValue = value
    return this
  }

  single() {
    this.singleValue = true
    return this
  }

  async execute(): Promise<QueryResponse> {
    const res = await fetch('/api/local-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: this.action,
        table: this.table,
        payload: this.payload,
        filters: this.filters,
        orFilters: this.orFilters,
        order: this.orderBy,
        limit: this.limitValue,
        single: this.singleValue,
        count: this.countValue,
        head: this.headValue,
      }),
    })
    const json = await res.json()
    return json
  }

  then<TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected)
  }
}

function storagePublicUrl(bucket: string, storagePath: string) {
  return '/uploads/' + bucket + '/' + storagePath.split('/').map(encodeURIComponent).join('/')
}

export const supabase: any = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const res = await fetch('/api/local-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signInWithPassword', email, password }),
      })
      return res.json()
    },

    async signUp({ email, password }: { email: string; password: string }) {
      const res = await fetch('/api/local-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signUp', email, password }),
      })
      return res.json()
    },

    async signOut() {
      const res = await fetch('/api/local-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signOut' }),
      })
      return res.json()
    },

    async getUser() {
      const res = await fetch('/api/local-auth', { cache: 'no-store' })
      return res.json()
    },
  },

  from(table: string) {
    return new LocalQuery(table)
  },

  storage: {
    from(bucket: string) {
      return {
        getPublicUrl(storagePath: string) {
          return { data: { publicUrl: storagePublicUrl(bucket, storagePath) } }
        },

        async upload(storagePath: string, file: File, options?: { contentType?: string }) {
          const formData = new FormData()
          formData.append('bucket', bucket)
          formData.append('path', storagePath)
          formData.append('file', file, file.name)
          if (options?.contentType) formData.append('contentType', options.contentType)
          const res = await fetch('/api/local-storage', { method: 'POST', body: formData })
          return res.json()
        },

        async remove(paths: string[]) {
          const res = await fetch('/api/local-storage', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket, paths }),
          })
          return res.json()
        },
      }
    },
  },
}
