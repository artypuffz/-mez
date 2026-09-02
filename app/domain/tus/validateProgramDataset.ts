import { RESIDENCY_PROGRAMS, PRODUCTION_PROGRAMS, LEGACY_PROGRAMS, type ResidencyProgram } from "../config/residencyPrograms";
import { resolveEntryThreshold } from "./resolveEntryThreshold";
import { HOSPITAL_DEFINITIONS } from "../config/hospitals";
import { BRANCH_DEFINITIONS } from "../config/branches";
import { CITY_DEFINITIONS } from "../config/cities";
import { DEFAULT_TUS_SCORE_CONFIG } from "../config/tusScoreConfig";

// Phase 11 §37 — a dedicated dataset validator (separate from
// domain/events/validation.ts, which only validates event content),
// covering exactly the checks the spec names. Used by both
// scripts/validateTusDataset.ts (CI/local check) and this module's own
// tests.
export interface DatasetValidationIssue {
  severity: "error" | "warning";
  programId?: string;
  message: string;
}

const EXCLUDED_BASIC_SCIENCE_NAMES = new Set([
  "Anatomi", "Fizyoloji", "Histoloji ve Embriyoloji", "Tıbbi Mikrobiyoloji",
  "Tıbbi Genetik", "Tıbbi Patoloji", "Halk Sağlığı", "Adli Tıp",
]);

const DIFFICULTY_MODIFIER_RANGE: [number, number] = [-0.5, 0.5];

export function validateProgramDataset(
  programs: readonly ResidencyProgram[] = RESIDENCY_PROGRAMS
): DatasetValidationIssue[] {
  const issues: DatasetValidationIssue[] = [];

  const hospitalIds = new Set(HOSPITAL_DEFINITIONS.map((h) => h.id));
  const branchIds = new Set(BRANCH_DEFINITIONS.map((b) => b.id));
  const branchNames = new Set(BRANCH_DEFINITIONS.map((b) => b.name));
  const cityIds = new Set(CITY_DEFINITIONS.map((c) => c.id));

  // duplicate program id
  const seenIds = new Map<string, number>();
  for (const program of programs) {
    seenIds.set(program.id, (seenIds.get(program.id) ?? 0) + 1);
  }
  for (const [id, count] of seenIds) {
    if (count > 1) issues.push({ severity: "error", programId: id, message: `Duplicate program id (${count}x)` });
  }

  // duplicate institution+branch combination (same hospital+branch twice —
  // would silently split one real program's quota across two rows)
  const seenInstitutionBranch = new Map<string, string[]>();
  for (const program of programs) {
    const key = `${program.hospitalId}::${program.branchId}`;
    seenInstitutionBranch.set(key, [...(seenInstitutionBranch.get(key) ?? []), program.id]);
  }
  for (const [key, ids] of seenInstitutionBranch) {
    if (ids.length > 1) {
      issues.push({
        severity: "warning",
        programId: ids[0],
        message: `Same institution+branch (${key}) appears in ${ids.length} program rows: ${ids.join(", ")}`,
      });
    }
  }

  for (const program of programs) {
    // unknown hospital
    if (!hospitalIds.has(program.hospitalId)) {
      issues.push({ severity: "error", programId: program.id, message: `Unknown hospitalId "${program.hospitalId}"` });
    }
    // unknown branch
    if (!branchIds.has(program.branchId)) {
      issues.push({ severity: "error", programId: program.id, message: `Unknown branchId "${program.branchId}"` });
    }
    // unknown city
    if (!cityIds.has(program.cityId)) {
      issues.push({ severity: "error", programId: program.id, message: `Unknown cityId "${program.cityId}"` });
    }
    // unsupported basic-science branch leakage — checked by NAME, since a
    // basic-science branch would never get a valid branchId to begin with,
    // but this catches a branch definition itself accidentally carrying an
    // excluded name.
    if (branchIds.has(program.branchId)) {
      const branch = BRANCH_DEFINITIONS.find((b) => b.id === program.branchId)!;
      if (EXCLUDED_BASIC_SCIENCE_NAMES.has(branch.name)) {
        issues.push({
          severity: "error",
          programId: program.id,
          message: `Program references excluded basic-science branch "${branch.name}"`,
        });
      }
    }

    // invalid TUS score (either field — see resolveEntryThreshold)
    const threshold = resolveEntryThreshold(program);
    if (threshold !== undefined) {
      if (
        !Number.isFinite(threshold) ||
        threshold < DEFAULT_TUS_SCORE_CONFIG.minScore ||
        threshold > DEFAULT_TUS_SCORE_CONFIG.maxScore
      ) {
        issues.push({
          severity: "error",
          programId: program.id,
          message: `entry threshold ${threshold} outside the valid TUS score range [${DEFAULT_TUS_SCORE_CONFIG.minScore}, ${DEFAULT_TUS_SCORE_CONFIG.maxScore}]`,
        });
      }
    }

    // Android Device QA Hotfix 1, Issue 2 — a regression guard: every real
    // production program must carry a gameplayEntryThreshold. Without
    // this, a future edit that stops computing it would silently
    // regress back into "undefined = universally available at any score",
    // exactly the bug this hotfix fixes.
    if (program.sourceType === "real" && program.gameplayEntryThreshold === undefined) {
      issues.push({
        severity: "error",
        programId: program.id,
        message: `real production program is missing gameplayEntryThreshold — it would be selectable at any TUS score`,
      });
    }

    // invalid quota
    if (program.quota !== undefined && (!Number.isInteger(program.quota) || program.quota <= 0)) {
      issues.push({ severity: "error", programId: program.id, message: `Invalid quota ${program.quota} (must be a positive integer)` });
    }

    // difficulty modifier range violation
    if (program.difficultyModifier) {
      const [min, max] = DIFFICULTY_MODIFIER_RANGE;
      const { onCallLoad, workingHours } = program.difficultyModifier;
      if (onCallLoad < min || onCallLoad > max) {
        issues.push({
          severity: "error",
          programId: program.id,
          message: `difficultyModifier.onCallLoad ${onCallLoad} outside [${min}, ${max}]`,
        });
      }
      if (workingHours < min || workingHours > max) {
        issues.push({
          severity: "error",
          programId: program.id,
          message: `difficultyModifier.workingHours ${workingHours} outside [${min}, ${max}]`,
        });
      }
    }
  }

  // missing duration — a per-branch check, not per-program.
  for (const branch of BRANCH_DEFINITIONS) {
    if (!Number.isFinite(branch.residencyYears) || branch.residencyYears <= 0) {
      issues.push({ severity: "error", message: `Branch "${branch.id}" has an invalid/missing residencyYears (${branch.residencyYears})` });
    }
    if (!branch.durationYearsVerified) {
      issues.push({
        severity: "warning",
        message: `Branch "${branch.id}" (${branch.name}) uses an UNVERIFIED default residencyYears=${branch.residencyYears} — see docs/program-data-sources.md`,
      });
    }
  }

  return issues;
}
