/* Ewreka Nota — ağ koruması
 * Ewreka Ofis çevrimdışı çalışır: telemetri, analitik, CDN ya da uzak API çağrısı OLMAMALI.
 * SuperDoc'un telemetrisi yapılandırmada kapatılır; bu katman ek bir emniyet kemeridir:
 * sayfanın kendi kökeni (ewreka://app, localhost), blob: ve data: dışındaki tüm istekleri engeller.
 */
const ALLOWED_PROTOCOLS = new Set(['blob:', 'data:', 'about:', 'ewreka:', 'file:']);

function isAllowed(url) {
  try {
    const u = new URL(String(url), location.href);
    if (ALLOWED_PROTOCOLS.has(u.protocol)) return true;
    if (u.origin === location.origin) return true;
    return false;
  } catch (_) {
    return true; // çözümlenemeyen göreli yol: tarayıcı zaten yerelde çözer
  }
}

function blocked(kind, url) {
  // eslint-disable-next-line no-console
  console.debug(`[nota] uzak ${kind} isteği engellendi:`, String(url));
}

export function installNetGuard() {
  if (window.__notaNetGuard) return;
  window.__notaNetGuard = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' || input instanceof URL ? input : input && input.url;
    if (url && !isAllowed(url)) {
      blocked('fetch', url);
      return Promise.reject(new TypeError('Ağ erişimi devre dışı (çevrimdışı mod)'));
    }
    return origFetch(input, init);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (url && !isAllowed(url)) {
      blocked('XHR', url);
      this.__notaBlocked = true;
      return origOpen.call(this, method, 'data:text/plain,', ...rest);
    }
    return origOpen.call(this, method, url, ...rest);
  };

  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      if (!isAllowed(url)) { blocked('beacon', url); return true; }
      return origBeacon(url, data);
    };
  }

  const OrigWS = window.WebSocket;
  if (OrigWS) {
    window.WebSocket = function (url, protocols) {
      blocked('WebSocket', url);
      throw new Error('Ağ erişimi devre dışı (çevrimdışı mod)');
    };
    window.WebSocket.prototype = OrigWS.prototype;
  }
  const OrigES = window.EventSource;
  if (OrigES) {
    window.EventSource = function (url) {
      blocked('EventSource', url);
      throw new Error('Ağ erişimi devre dışı (çevrimdışı mod)');
    };
  }
}
