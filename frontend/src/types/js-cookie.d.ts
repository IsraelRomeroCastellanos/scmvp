// frontend/src/types/js-cookie.d.ts
declare module 'js-cookie' {
  export interface CookieAttributes {
    expires?: number | Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }

  export default interface Cookies {
    get(name: string): string | undefined;
    set(name: string, value: string, options?: CookieAttributes): void;
    remove(name: string, options?: CookieAttributes): void;
    getJSON(name: string): any;
  }

  const Cookies: Cookies;
  export default Cookies;
}