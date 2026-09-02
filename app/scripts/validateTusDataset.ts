// npm run validate:tus-dataset
// Phase 11 §37 — validates the real ÖSYM program dataset (duplicate ids,
// unknown branch/city/hospital, invalid score/quota, difficulty-modifier
// range violations, basic-science leakage, missing branch duration).
import { validateProgramDataset } from "../domain/tus/validateProgramDataset";
import { RESIDENCY_PROGRAMS } from "../domain/config/residencyPrograms";

function main() {
  const issues = validateProgramDataset();
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  console.log(`Checked ${RESIDENCY_PROGRAMS.length} programs.`);
  if (errors.length === 0) {
    console.log(`✓ 0 errors, ${warnings.length} warning(s).`);
  } else {
    console.log(`✗ ${errors.length} error(s), ${warnings.length} warning(s).`);
  }

  for (const issue of errors) {
    console.log(`  ERROR   [${issue.programId ?? "-"}] ${issue.message}`);
  }
  for (const issue of warnings) {
    console.log(`  WARNING [${issue.programId ?? "-"}] ${issue.message}`);
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
