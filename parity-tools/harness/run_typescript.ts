/**
 * Parity harness TypeScript fixture runner.
 *
 * Usage:
 *   tsx run_typescript.ts <fixture.json> [<fixture.json> ...]
 *
 * Writes one result JSON per fixture to
 * parity-tools/harness/results/typescript/<path>.
 *
 * MUST be invoked from the pyjhora-web/ working directory so @/ path aliases
 * resolve. The Makefile handles this.
 *
 * Deviation from spec: init function is `initializeEphemeris` (not
 * `initSwissEph`) — that is the actual export name in swe-adapter.ts.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { coerce } from '../../pyjhora-web/src/parity/coercion';
import {
  initializeEphemeris,
  setAyanamsaMode,
} from '../../pyjhora-web/src/core/ephemeris/swe-adapter';

interface Fixture {
  python_target: string;
  typescript_target: string;
  setup?: { ayanamsa?: string };
  cases: Array<{ id: string; inputs: unknown; description?: string }>;
}

interface CaseResult {
  id: string;
  ok: boolean;
  result: unknown;
  error: string | null;
}

const HARNESS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const REPO_ROOT = path.resolve(HARNESS_DIR, '..', '..');
const PYJHORA_WEB_SRC = path.join(REPO_ROOT, 'pyjhora-web', 'src');

const ALIAS_PREFIXES: Array<[string, string]> = [
  ['@/', ''],
  ['@core/', 'core/'],
  ['@components/', 'components/'],
  ['@services/', 'services/'],
  ['@hooks/', 'hooks/'],
  ['@i18n/', 'i18n/'],
];

function resolveTsTarget(target: string): { filePath: string; exportName: string } {
  const sepIdx = target.indexOf('::');
  if (sepIdx === -1) throw new Error(`Invalid typescript_target: ${target}`);
  const pathPart = target.slice(0, sepIdx);
  const exportName = target.slice(sepIdx + 2);
  let resolved = pathPart;
  for (const [prefix, replacement] of ALIAS_PREFIXES) {
    if (pathPart.startsWith(prefix)) {
      resolved = replacement + pathPart.slice(prefix.length);
      break;
    }
  }
  return { filePath: path.join(PYJHORA_WEB_SRC, `${resolved}.ts`), exportName };
}

function makeJsonSafe(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(makeJsonSafe);
  if (value === null || value === undefined) return value;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = makeJsonSafe(v);
    }
    return out;
  }
  if (typeof value === 'function') return `<function ${(value as Function).name}>`;
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  return value;
}

async function runFixture(fixturePath: string): Promise<unknown> {
  const fixture: Fixture = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));
  const { filePath, exportName } = resolveTsTarget(fixture.typescript_target);
  const module = await import(pathToFileURL(filePath).href);
  const target = module[exportName];
  if (typeof target !== 'function') {
    throw new Error(`Export ${exportName} at ${filePath} is not a function`);
  }

  const ayanamsa = fixture.setup?.ayanamsa ?? 'LAHIRI';

  const results: CaseResult[] = [];
  for (const c of fixture.cases) {
    try {
      setAyanamsaMode(ayanamsa);
    } catch {
      // Not all targets need ayanamsa (e.g. Math.sqrt).
    }
    try {
      const inputs = coerce(c.inputs);
      let out;
      if (inputs !== null && typeof inputs === 'object' && !Array.isArray(inputs)) {
        const argNames = Object.keys(inputs as Record<string, unknown>);
        if (argNames.length > 0) {
          // Pass positional: order matters — fixture inputs object key order is the arg order.
          out = await target(
            ...argNames.map((k) => (inputs as Record<string, unknown>)[k]),
          );
        } else {
          out = await target(inputs);
        }
      } else if (Array.isArray(inputs)) {
        out = await target(...(inputs as unknown[]));
      } else {
        out = await target(inputs);
      }
      results.push({ id: c.id, ok: true, result: makeJsonSafe(out), error: null });
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      results.push({ id: c.id, ok: false, result: null, error: msg });
    }
  }

  return {
    fixture: fixturePath,
    runtime: 'typescript',
    runtime_version: process.version,
    ayanamsa,
    generated_at: new Date().toISOString(),
    cases: results,
  };
}

async function main() {
  const fixtures = process.argv.slice(2);
  if (fixtures.length === 0) {
    console.error('Usage: tsx run_typescript.ts <fixture.json> [<fixture.json> ...]');
    process.exit(1);
  }
  await initializeEphemeris();
  const outputRoot = path.join(HARNESS_DIR, 'results', 'typescript');
  const fixturesRoot = path.join(HARNESS_DIR, 'fixtures');
  await fs.mkdir(outputRoot, { recursive: true });
  for (const f of fixtures) {
    const abs = path.resolve(f);
    const result = await runFixture(abs);
    let rel: string;
    if (abs.startsWith(fixturesRoot)) {
      rel = path.relative(fixturesRoot, abs);
    } else {
      rel = path.basename(abs);
    }
    const outFile = path.join(outputRoot, rel);
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await fs.writeFile(outFile, JSON.stringify(result, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
