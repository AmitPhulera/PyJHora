/**
 * Tag-aware JSON coercion for parity harness fixtures.
 * Mirror of parity-tools/harness/coercion.py.
 *
 * Converts JSON values tagged with {__type, value} into native TS structures.
 * Plain primitives, arrays, and untagged objects pass through (with recursion).
 */

type Coercer = (value: any) => any;

const coercers: Record<string, Coercer> = {
  Place: (value) => ({
    name: value.name,
    latitude: value.latitude,
    longitude: value.longitude,
    timezone: value.timezone,
  }),
  Date: (value) => ({
    year: value.year,
    month: value.month,
    day: value.day,
  }),
};

export function coerce(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((x) => coerce(x));
  }
  if (node !== null && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const typeTag = obj.__type as string | undefined;
    if (typeTag !== undefined) {
      const coercer = coercers[typeTag];
      if (coercer === undefined) {
        throw new Error(`Unknown __type tag: ${typeTag}`);
      }
      return coercer(obj.value);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = coerce(v);
    }
    return out;
  }
  return node;
}
