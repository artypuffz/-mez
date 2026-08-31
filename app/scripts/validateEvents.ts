// npm run validate:events
// Loads every event in data/events/examples/*.json, runs it through the
// same Zod schema + cross-event checks the app uses at startup
// (domain/events/validation.ts), and reports duplicate ids, dangling
// chain/checkpoint references, fallback misconfiguration, and any other
// content bug — without needing the app or a device running.
import { getContentValidationIssues, loadValidatedEvents } from "../domain/events/content";

function main() {
  const issues = getContentValidationIssues();
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (errors.length === 0) {
    let count = 0;
    try {
      count = loadValidatedEvents().length;
    } catch {
      // unreachable if errors.length === 0, but keep the script honest
    }
    console.log(`✓ ${count} events validated, 0 errors, ${warnings.length} warning(s).`);
  } else {
    console.log(`✗ ${errors.length} error(s), ${warnings.length} warning(s).`);
  }

  for (const issue of errors) {
    console.log(`  ERROR   [${issue.eventId ?? "-"}] ${issue.message}`);
  }
  for (const issue of warnings) {
    console.log(`  WARNING [${issue.eventId ?? "-"}] ${issue.message}`);
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
