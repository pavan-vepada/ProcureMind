"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null; email?: string };

const Credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters for the password."),
});

function readCredentials(formData: FormData) {
  return Credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
}

/** Sign-up and log-in share one form; a hidden "mode" field says which. */
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  return formData.get("mode") === "login" ? logIn(formData) : signUp(formData);
}

async function signUp(formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) return { error: error.message, email };
  if (!data.session) {
    // Supabase only withholds the session when email confirmation is switched on.
    return { error: "Account created, but Supabase is asking for email confirmation. Switch it off in Supabase → Authentication → Sign In / Providers → Email.", email };
  }
  redirect("/rfx");
}

async function logIn(formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That email and password don't match an account.", email };
  redirect("/rfx");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
