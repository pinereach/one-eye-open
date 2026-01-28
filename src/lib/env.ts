/** True when running on localhost or dev ports (auth is bypassed in this case). */
export const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '8788' ||
    window.location.port === '3000');
