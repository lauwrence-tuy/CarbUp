/**
 * Stand-in for `next/headers` outside a Next.js request: route handlers read
 * and write this jar through `cookies()`, and tests sign in by putting a
 * session cookie in it.
 */
export const cookieJar = new Map<string, string>();

export async function cookies() {
  return {
    get(name: string) {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string) {
      cookieJar.set(name, value);
    },
    delete(name: string) {
      cookieJar.delete(name);
    }
  };
}

export async function headers() {
  return new Headers();
}
