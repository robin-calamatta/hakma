// Client configuration. Leave SERVER_URL empty when the game is served by the Hakma server itself (recommended).
// If you host the static client somewhere else (e.g. a CDN), set this to your server's origin, e.g. 'https://hakma.example.com'.
export const CONFIG = {
  SERVER_URL: (typeof window !== 'undefined' && window.HAKMA_SERVER) || '',
  VERSION: '1.0.0',
  // Online features (accounts, friends, online co-op, cloud saves). Needs the Hakma server. Set to true when you deploy the server.
  ONLINE: false,
};
