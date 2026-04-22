# Zupfnoter: Refactor‑ und Migration‑Plan

Dieses Dokument fasst die Diskussion über die Migration von Zupfnoter (bwl21/zupfnoter) hin zu einer TypeScript‑basierten Architektur zusammen, inkl. w2ui‑Upgrade, Vue‑Portierung und langfristiger Strukturempfehlung.

## 1. Aktuelle Zupfnoter‑Architektur

- Frontend:  
  - w2ui (UI‑Toolkit, Grids, Layouts, Tabs, Forms)  
  - jQuery‑basierte Integration  
  - ABC‑Parsing, Layout‑Berechnung, Rendering über Opal / Ruby‑Code  
- Backend:  
  - Ruby on Rails + Opal (jsb)  
  - keine echte API‑Schicht im klassischen Sinn  
- CLI‑Version:  
  - Ruby‑basiertes CLI‑Tool für PDF‑/HTML‑/Text‑Exporte  
- Web‑Version:  
  - Client‑seitiger Web‑Editor (im Browser laufend)  

Quelle: https://github.com/bwl21/zupfnoter


## 2. Migration von w2ui 1.x auf w2ui 2.x

Ziel: w2ui 1.5 auf 2.x portieren, ohne Opal‑Stack zu ändern.

### 2.1. Wichtige Änderungen in w2ui 2.x

- Kein jQuery mehr nötig; w2ui arbeitet als Vanilla‑JS‑/ES‑Modul‑Bibliothek.
- Neues Event‑Schema:
  - `event.detail` statt `event`‑props
  - `await event.complete()` statt `event.done(...)`
- Wegfall aller `deprecated`‑Props (z. B. `tab.caption`, bestimmte Grid‑/Form‑Properties).

Quellen:  
- https://github.com/vitmalina/w2ui/discussions/2403  
- https://github.com/vitmalina/w2ui/discussions/2015  
- https://w2ui.com

### 2.2. Schritt‑für‑Schritt‑Upgrade‑Plan

1. **Version identifizieren**  
   - Welche `w2ui‑1.x.min.js` wird im Projekt genutzt?  
   - Entscheiden: nur w2ui ersetzen oder auch jQuery rausnehmen.

2. **w2ui 2.x einbinden**  
   - Neue Datei herunterladen oder per CDN verwenden.
   - Beispiel (ES‑Module):
     ```html
     <script type="module">
         import * as w2ui from 'https://unpkg.com/w2ui';
     </script>
     ```

3. **Event‑Handler anpassen**  
   - Beispiele:
     ```js
     // alt
     grid.on('select', (event) => {
         const recid = event.recid;
     });
     
     // neu
     grid.on('select', (event) => {
         const { recid } = event.detail;
         // ggf.
         // await event.complete();
     });
     ```

4. **deprecated Properties entfernen**  
   - Prüfe:
     - Grid‑Properties (`multiSelect`, `hidden`‑Spalten, `searches`)  
     - Form‑Properties (`tabs.caption`, `onLoad`, `onRender`)  
   - Alpha‑Check: alle `w2ui`‑Warnungen in Dev‑Tools als Tickets behandeln.

5. **Layout‑Komponenten überprüfen**  
   - `w2layout`, `w2toolbar`, `w2sidebar`, `w2grid`, `w2form`  
   - Struktur gegen aktuelle w2ui‑Demos (https://w2ui.com/web/) abgleichen.

Quellen:  
- https://w2ui.com/web/  
- https://w2ui.com/web/get-started


## 3. Opal entfernen, voll auf TypeScript umstellen

### 3.1. Vision der neuen Architektur

- Frontend: Vue 3 + TypeScript  
- Backend: Node‑basiertes API‑Backend (optional, je nach Szenario)  
- Kern‑Logik:  
  - ABC‑Parsing  
  - Layout‑Berechnung  
  - PDF‑/HTML‑Rendering  
  → in eigenem TypeScript‑Paket (`@zupfnoter/core`) auslagern.

Diskussion:  
- TypeScript‑basierte Neuausrichtung  
- Weg von Opal und Ruby‑basiertem Client‑Code  
- Möglichkeit eines neuen Monorepo‑Setups  
  - `packages/core`  
  - `packages/types`  
  - `apps/frontend` (Vue)  
  - `apps/api` (Node, falls nötig)  
  - `infra/` (Docker, CI, etc.)

### 3.2. Empfehlung: Neues Repository

- Neues Repo: z. B. `bwl21/zupfnoter‑ts`  
- Altes Repo:  
  - `bwl21/zupfnoter` bleibt als „legacy‑only“  
  - Keine neuen Features mehr  
- Vorteile:
  - Saubere Trennung  
  - Unabhängiger Rollout  
  - Bessere CI/Deployment‑Struktur  
  - Neue Tech‑Stack‑Tools (Vite, TypeScript, modernes Testing)

### 3.3. Ordner‑Struktur‑Vorschlag

```text
zupfnoter-ts/
├── packages/
│   ├── core/        # TypeScript‑Kern‑Logik
│   └── types/       # gemeinsame Typen
├── apps/
│   ├── web/         # Vue‑Frontend
│   └── api/         # Node‑API (optional)
│   └── cli/         # TypeScript‑CLI
├── infra/           # Docker‑Compose, nginx‑Config etc.
├── package.json     # Monorepo‑Workspace (PNPM/Yarn 3)
```

Beispiel‑Paketstruktur:

- `@zupfnoter/core`
- `@zupfnoter/types`
- `@zupfnoter/web`
- `@zupfnoter/cli`
- `@zupfnoter/api` (optional)

Quelle: empfohlene Architektur aus dem Thread

## 4. Zupfnoter hat kein Backend

Besonderheit: Zupfnoter hat **kein klassisches Backend‑API‑Backend**, sondern:

- Web‑Version:
  - statisch gehosteter Opal‑Client im Browser
- CLI‑Version:
  - Ruby‑basiertes CLI‑Tool für lokale PDF/HTML/TXT‑Erstellung

Konsequenz für TypeScript‑Rewrite:

- Kein Node‑API‑Server zwingend nötig
- Fokus:
  - `apps/web` (Vue 3 + TypeScript Frontend)
  - `apps/cli` (TypeScript‑CLI‑Tool)
  - `packages/core` (zentrale Logik)

Empfehlung bleibt:

- neues Repo: `zupfnoter-ts`
- `bwl21/zupfnoter` als legacy‑only

## 5. Schritt‑1: w2ui 2.x im alten Code

Ist es sinnvoll, zuerst im alten `bwl21/zupfnoter`:

- w2ui 1.x auf 2.x zu migrieren
- Opal‑Stack beizubehalten

Ja – das ist sinnvoll, wenn du:

- UI‑Modernisierung willst,
- aber Opal‑Rewrite später angehen möchtest.

Vorteile:

- Sauberere, modernere UI‑Schicht
- Bessere Event‑API, bessere Performance
- Einfacherer Schritt‑2‑Rewrite (Opal → TypeScript)

Nachteile:

- Du bekommst keinen TypeScript‑Stack, nur moderneres UI‑Toolkit

Es ist **nicht Pflicht**, aber **sinnvoll als Zwischenschritt**.

## 6. Schritt‑2: TypeScript‑Rewrite im neuen Repo

Strategie:

1. **TypeScript‑Stack aufsetzen**
   - `packages/core` (Kern‑Logik)
   - `apps/cli` (TypeScript‑CLI)
   - `apps/web` (optional, aber noch ohne Vue‑UI)
2. **UI‑Frameworks später**
   - Nachdem TypeScript‑Stack stabil ist
   - dann in `apps/web`
     - Vue 3 + TypeScript
     - ggf. UI‑Bibliothek (z. B. Naive UI, PrimeVue)
     - Portierung der alten w2ui‑Layouts/Forms/Tabs

Damit trennst du klar:

- Schritt 1: Logik‑Portierung (Ruby/Opal → TypeScript)
- Schritt 2: UI‑Portierung (w2ui → Vue + moderne Komponenten)

## 7. Vue‑Portierung: UI‑Bibliotheken sinnvoll?

## 7.1. Warum eine Komponenten‑Bibliothek?

Du brauchst:

- Tab‑Layouts
- Grids / Tabellen
- Formular‑Controls
- Dialoge / Popups
- Layout‑Splitter (Editor vs. Preview)

Eine moderne, Vue‑basierte Komponenten‑Bibliothek spart dir:

- Aufbau eigener w2ui‑ähnlicher Widgets
- CSS‑Gedöns
- Tests und Accessibility‑Sachen

## 7.2. Empfohlene Bibliotheken

- **Naive UI**
  - Sehr TypeScript‑freundlich
  - Tab‑Layouts, Grids, Forms, Layouts, Dark‑Mode
  - Geeignet als „zentrale UI‑Lib“, ähnlich wie w2ui früher
  - [https://www.naiveui.com](https://www.naiveui.com/)
- **PrimeVue**
  - Sehr umfangreiche Widget‑Bibliothek
  - Grids, Tabs, Forms, Dialoge, Menüs
  - Geeignet für „Enterprise‑Desktop‑Web“
  - https://www.primefaces.org/primevue/
- **Tailwind‑basierte Kombinationen**
  - `tailwindcss` + `@headlessui/vue`
  - Für eigene, sehr schlank gebaute Komponenten
  - Gute, wenn du maximale Design‑Kontrolle willst

## 8. Empfohlene Gesamt‑Empfehlung

- **Altes Repo**:
  - `bwl21/zupfnoter`
  - Ziel:
    - keine neuen Features
    - ggf. Schritt‑1: w2ui 1.x → w2ui 2.x
- **Neues Repo**:
  - `bwl21/zupfnoter‑ts`
  - Ziel:
    - TypeScript‑basiert
    - `packages/core`
    - `apps/cli`
    - `apps/web` (Vue)
- **Zu verwendende Tools** (Vorschlag):
  - TypeScript
  - Vue 3 (Composition API + TypeScript)
  - Vite
  - PNPM oder Yarn 3 Workspaces
  - Naive UI oder PrimeVue als UI‑Bibliothek
  - Docker‑Compose (falls nötig für Hosting / CI)



