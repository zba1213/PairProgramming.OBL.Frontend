# DR musiksamling – frontend

Første brugerhistorie: vis alle musikplader fra REST API med Vue 3 og Axios.
HTML/CSS/JavaScript-projekt til VS Code; ingen build kræves.

1. Start backend fra `PairProgramming.OBL` på http://localhost:5000.
2. Kør `python -m http.server 5500` fra denne mappe (eller VS Code Live Server på port 5500).
3. Åbn http://localhost:5500. Brug ikke file://.

Siden viser indlæsning, tom samling og fejl med mulighed for at prøve igen.
Varighed vises som minutter:sekunder, mens API bruger heltalssekunder.
Vue og Axios hentes fra CDN, så internetadgang kræves.

UI-tests ligger separat i `PairProgramming.OBL.UITests`.
Ved FTP-publicering: upload index.html, styles.css, config.js og app.js.
Ret API-adressen i config.js til backendens HTTPS-URL og tillad frontendens origin i backendens CORS-konfiguration.
Hosting er endnu ikke konfigureret.
