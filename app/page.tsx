import { AuthForm } from "./auth-form";

/** S1: sign in or create an account. Signed-in visitors are sent to /rfx by proxy.ts. */
export default function Landing() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f6f4ef] bg-[url('/login-bg.svg')] bg-cover bg-center px-4 py-12">
      <AuthForm />
    </main>
  );
}
