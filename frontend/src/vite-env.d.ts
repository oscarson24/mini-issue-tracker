/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides the API base URL (default: "/api", proxied by Vite in dev and Nginx in Docker). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
