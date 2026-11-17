# DR musiksamling – frontend

Vue 3, Vite og Axios. Vue-komponenterne ligger i `src/`: `App.vue` viser
samlingen, og `components/` indeholder login og formularen til plader.

## Kør lokalt

1. Start backend fra backend-repoet med `dotnet run --project src/MusicRecords.Api --launch-profile http`.
2. Installer en Node.js-version, der opfylder `engines.node` i `package.json`.
3. Kør disse kommandoer i frontendmappen:

   ```sh
   npm ci
   npm run dev
   ```

4. Åbn http://localhost:5500. Frontend bruger som standard API'et på http://localhost:5000.

Liste og søgning virker uden login. Konfigurér en lokal testkonto som
beskrevet i backendens README. Rollen `Editor` kan tilføje, redigere og
slette plader. En genindlæsning afslutter sessionen.

UI-tests ligger i det separate `PairProgramming.OBL.UITests`-repo.

## Byg og publicér

Kør `npm run build` og upload indholdet af `dist/` via FTP. Til lokal
kontrol af det færdige build kan du stoppe udviklingsserveren og køre
`npm run preview`.

Sæt `VITE_API_BASE_URL` til API'ets HTTPS-adresse før build, fx i
`.env.production.local`. Backend skal tillade frontendens origin i sin
CORS-konfiguration.
