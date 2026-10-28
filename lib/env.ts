function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is missing. Add it to .env.local (see .env.example).`);
  return value;
}

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them into browser code.
export const supabaseUrl = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = () =>
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
