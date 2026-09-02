# Program Data Sources — Phase 11

This document exists to keep a hard, explicit line between what came from an
official source and what is gameplay content ÇÖMEZ invented on top of it. Do
not mix these two categories when editing the dataset or the branch
config — see "Never mix these" at the end.

## 1. Institution/program dataset

- **Source**: "2026 TUS 2. DÖNEM KONTENJAN PLANLAMASI" (official ÖSYM
  quota-planning table), supplied directly by the user as a PDF because this
  session's network sandbox blocks `osym.gov.tr` and every third-party TUS
  data mirror tried (WebFetch returns `EGRESS_BLOCKED` for all of them).
- **Dönem discrepancy**: the Phase 11 spec named "2026-TUS 1. Dönem Tercih
  Bilgileri ve Tablolar" as the target source. The document actually
  supplied is the **2. Dönem** kontenjan planlaması table. This is a real,
  documented mismatch — flagged here rather than silently treated as
  equivalent. The 2. Dönem table is still a genuine, official ÖSYM planning
  document (not a fabricated substitute), and was used because it's what
  was available; if the 1. Dönem table differs in institution/quota detail,
  that is a legitimate Phase 12 follow-up (re-import against the correct
  dönem).
- **Retrieval/import date**: 2026-09-01 (the date the PDF was supplied and
  parsed in this session).
- **Extraction method**: `pdftotext -layout` (poppler-utils) followed by an
  anchor-based regex parser keyed on closed-vocabulary fields (SINIF
  single-letter code, TÜR institution-type code, UZMANLIK ALANI branch name
  against the 26-branch whitelist, KONTENJAN trailing integer) — chosen over
  fixed-column-position parsing after confirming the PDF's layout mode does
  NOT preserve fixed column offsets when optional columns are empty.
  2935 rows parsed, 0 unmatched.
- **Filter applied**: TÜR in {EAH, ÜNİ} (civilian training/research
  hospitals and universities only — no military/other institution types)
  AND UZMANLIK ALANI in the 26 supported clinical branches (see
  `domain/config/branches.ts`). 2191 rows survived the filter, across 159
  institutions and 62 cities.

### Official data (from the ÖSYM table directly)

- Institution name (`HospitalDefinition.name`, `kind: "university" |
  "training_research_hospital"`)
- City (`cityId`)
- Branch/uzmanlık alanı (`branchId`, name-normalized against the 26-branch
  whitelist)
- Quota (`ResidencyProgram.quota`)
- Joint-use university partner, where the source table named one
  (`jointUsePartner`, EAH rows only)

### NOT included (source document doesn't have it)

- **TUS minimum/taban puanı** — a KONTENJAN PLANLAMASI table is a
  pre-exam quota-planning document, not a yerleştirme/taban puanı sonuç
  table. `ResidencyProgram.minScore` is left `undefined` for every real
  program rather than filled with an invented number — see
  `domain/tus/filterAvailablePrograms.ts` for how the game treats an
  absent score gate (available at any TUS score, not silently excluded).
- **Program code** — not present in this table's columns.

## 2. Branch difficulty baselines (`difficultyBaseline`)

- **Source**: a verbatim, user-provided 26-row table (Branş / Nöbet /
  Mesai / Hiyerarşi), given directly in the Phase 11 kickoff instructions
  as "authoritative... kendi başına yeniden üretme/değiştirme" (never
  regenerate/alter). Transcribed exactly as given into
  `domain/config/branches.ts`'s `BRANCH_DEFINITIONS`.
- **These are gameplay balance values**, not a scientific or institutional
  rating of real working conditions — explicitly stated in the source
  instructions and repeated here per §7 of the spec.

## 3. `weeklyBaseline` / `onCallProfile` (existing Phase 4/7 config fields)

- **İç Hastalıkları, Genel Cerrahi, Psikiyatri** (the 3 branches that
  predate Phase 11): left **completely untouched** at their Phase
  10-tuned values. Their `difficultyBaseline` is new (added this phase,
  sourced from the table above), but it does not retroactively change
  their existing weekly-pressure/on-call numbers — see the inline comment
  in `branches.ts` for why (the old hand-tuned values don't correlate
  cleanly with the new axes, and re-deriving them would silently
  re-litigate Phase 10's validated balance).
- **The 23 branches added this phase**: `weeklyBaseline`/`onCallProfile`
  are DERIVED from the authoritative `difficultyBaseline` axes via
  `deriveWeeklyBaseline`/`deriveOnCallProfile` (both in `branches.ts`) — a
  documented linear-interpolation formula, not hand-tuned per branch.
  Validated (not just structurally wired) via
  `scripts/simulatePhase11Branches.ts` — see the Phase 11 final report for
  the actual measured numbers and sanity-check results.

## 4. Procedural hospital culture

- **Not sourced from anything** — by design. `hiddenProfile.mobbingRisk`
  is deliberately absent for every real program (see
  `domain/config/residencyPrograms.ts`); at NPC-generation time it is
  derived per (gameSeed, programId) via
  `domain/residency/hospitalCulture.ts`, seeded and deterministic, never a
  static per-institution claim. See acceptance criterion "Gerçek
  hastanelere sabit mobbing puanı verilmemeli."

## 5. Program difficulty modifiers (`difficultyModifier`)

- **`onCallLoad`/`workingHours`, range -0.5..+0.5**: no reliable
  per-institution methodology exists for this in the current dataset, so
  every real program in this phase ships with the field omitted
  (equivalent to 0). This is the explicitly-sanctioned outcome per the
  spec's §23 ("Phase 11'in ilk versiyonunda birçok programın
  modifier'ının 0 olması kabul edilebilir") — not a gap to silently fill
  with guessed values later without a real source.

## 6. Branch residency durations (`residencyYears`)

- **İç Hastalıkları (4), Genel Cerrahi (5), Psikiyatri (4)**: pre-existing,
  already-trusted values from before Phase 11. Unchanged.
- **The other 23 branches**: this session could not reach a verifiable
  official source for the real Ek-1 çizelge durations (same network
  constraint as above; WebSearch's own synthesized summaries were
  internally inconsistent between queries — e.g. one summary claimed
  Çocuk Cerrahisi = 6 years, contradicting well-established general
  knowledge that it is 5). Per the explicit instruction
  ("emin değilsen uydurma; raporla ve nötr/default gameplay değerini
  kullan"), every one of these 23 branches uses a single, clearly-flagged
  **neutral default of 4 years**
  (`DEFAULT_UNVERIFIED_DURATION_YEARS` in `branches.ts`,
  `durationYearsVerified: false`). This is NOT a claim about any specific
  branch's real official duration — `npm run validate:tus-dataset` prints
  a warning for every branch in this state, and
  `domain/tus/validateProgramDataset.ts` asserts the warning count matches
  (23) as a regression guard against this gap being silently "resolved"
  without a real source.
- **Before treating any of the 23 defaulted durations as final**: spot-check
  against the actual Tıpta ve Diş Hekimliğinde Uzmanlık Eğitimi Yönetmeliği
  Ek-1 çizelgesi (Resmî Gazete / Tıpta Uzmanlık Kurulu). This directly
  affects residency-completion timing (`totalWeeks = residencyYears * 52`
  in `advanceResidencyWeek.ts`), so getting the real value right matters
  for gameplay, not just labeling accuracy.

## Never mix these

**Official data** = institution, city, branch, quota, program code, and a
TUS score ONLY if it genuinely came from an official results document.

**Gameplay data** = branch difficulty axes, procedural hospital culture,
program difficulty modifiers, the working-hours model, and (until
independently verified) the 23 defaulted branch durations.

A future edit that blends these — e.g. inferring a "real" TUS score from a
forum post, or attaching a culture/mobbing claim to a specific real
hospital — reintroduces exactly the risk this phase's design was built to
avoid. Don't.
