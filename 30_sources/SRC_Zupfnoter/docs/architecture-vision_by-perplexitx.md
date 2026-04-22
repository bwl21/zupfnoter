# Zupfnoter: Langfristige Architektur‑Vision

Ziel ist es, Zupfnoter schrittweise von einem Opal‑basierten, Ruby‑Stack mit w2ui‑UI‑Toolkit auf einen modernen, vollständig **TypeScript‑basierten Stack** umzustellen, ohne sofort alles „von heute auf morgen“ zu rewritesen.

## 1. Aktuelle Situation

- Projekt: [`bwl21/zupfnoter`](https://github.com/bwl21/zupfnoter)  
- Technologie: Webserver liefert Frontend:Opal, Frontend mit w2ui, jQuery, abc2svg, xml2abc
- Es gibt:
  - **Web‑Version** (im Browser, client‑seitig)  
  - **CLI‑Version** (Ruby‑basiert, lokale PDF/HTML/TXT‑Erstellung)

Der alte Code soll **keine neuen Features mehr** bekommen, nur Bugfixes und Stabilität.

## 2. Langfristiger Plan

Zupfnoter soll in zwei Schritten modernisiert werden:

1. **Vollständiger TypeScript‑Rewrite (Opal → TypeScript)**  
   - In einem **neuen Repository** `bwl21/zupfnoter‑ts`  
     - wird ein **TypeScript‑basiertes Core‑Paket** (`@zupfnoter/core`) entwickelt (abc‑Parsing, Layout‑Berechnung, Rendering).  
     - ein **TypeScript‑CLI‑Tool** (`@zupfnoter/cli`) ersetzt das alte Ruby‑CLI‑Tool.  
     - später ein **Vue‑Frontend** (`@zupfnoter/web`) auf Basis einer UI‑Bibliothek (z. B. Naive UI oder PrimeVue) die aktuelle w2ui‑UI ablöst.
2. **UI‑Modernisierung (w2ui → TypeScript)**  
   - Im bestehenden `bwl21/zupfnoter` w2ui 1.x auf **w2ui 2.x** migrieren (jQuery‑Entfernung, neue Event‑API, Entfernung von deprecated‑Props).  
   - Dies ist ein **Zwischenschritt**, um die UI‑Schicht zu modernisieren, ohne das Backend sofort zu ersetzen.

## 3. Handover‑Szenario

- **Altes Repo**:  
  - `bwl21/zupfnoter` bleibt als **legacy‑Only**.  
  - Ziel: stabil halten, keine neuen Features, ggf. nur Bugfixes und UI‑Modernisierung (w2ui 2.x).

- **Neues Repo**:  
  - `bwl21/zupfnoter‑ts` ist der **zukünftige Heimathafen**.  
  - Struktur:
    - `packages/core` (Kern‑Logik)  
    - `packages/types` (gemeinsame Typen)  
    - `apps/cli` (TypeScript‑CLI)  
    - `apps/web` (Vue‑Frontend, später hinzugefügt)  
  - Technologie:
    - TypeScript  
    - Vue 3 (Composition API + TypeScript)  
    - Vite  
    - PNPM / Yarn Workspaces  
    - ggf. Naive UI oder PrimeVue als UI‑Bibliothek

Damit lässt sich jederzeit ein **sauberer Rollout** machen:  
- Altes Zupfnoter bleibt als **Rescue‑Version**  
- Neues Zupfnoter‑ts als **zukünftige Hauptversion**