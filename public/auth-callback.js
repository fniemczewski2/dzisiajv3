// public/auth-callback.js
//
// Skrypt strony powrotu z logowania (/api/auth/callback). Zewnętrzny plik
// zamiast skryptu w treści strony – działa przy CSP bez 'unsafe-inline'.
// Powiadamia inne karty i okno, które otworzyło logowanie, a potem przechodzi
// pod bezpieczny adres z atrybutu data-next (sprawdzony na serwerze).
(function () {
  const requested = document.documentElement.dataset.next || "/";
  // Tylko ścieżka w tej domenie: „/…”, ale nie „//…” ani „/\…” (adres innej domeny).
  const BACKSLASH = 92;
  const safe = requested.startsWith("/") && !requested.startsWith("//") && requested.charCodeAt(1) !== BACKSLASH;
  const target = safe ? requested : "/";

  try {
    const channel = new BroadcastChannel("supabase-auth-channel");
    channel.postMessage("auth-success");
    channel.close();
  } catch (e) {
    /* przeglądarka bez BroadcastChannel */
  }

  try {
    localStorage.setItem("auth-success", String(Date.now()));
    localStorage.removeItem("auth-success");
  } catch (e) {
    /* tryb prywatny bez localStorage */
  }

  if (window.opener && window.opener !== window) {
    try {
      window.opener.postMessage("auth-success", window.location.origin);
    } catch (e) {
      /* okno otwierające jest już zamknięte */
    }
    window.close();
  }

  window.setTimeout(function () {
    window.location.replace(target);
  }, 300);
})();
