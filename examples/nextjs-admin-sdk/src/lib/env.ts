/**
 * Required-env helper. Throws a clear, actionable error if the var is
 * missing — preferable to a runtime `undefined` blowing up deep inside
 * better-auth or the Prisma adapter.
 */
export function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env: ${name}. Copy .env.example → .env.local and fill it in.`,
    );
  }
  return value;
}
