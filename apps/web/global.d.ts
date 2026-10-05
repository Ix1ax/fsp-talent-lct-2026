declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_PROXY_TARGET?: string;
      OIDC_TOKEN_URL?: string;
      OIDC_CLIENT_ID?: string;
      NEXT_PUBLIC_API_URL?: string;
    }
  }
}

export {};
