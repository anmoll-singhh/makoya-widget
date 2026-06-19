import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in to Makoya</h1>
        <p className="mt-1 text-sm text-neutral-500">We&apos;ll email you a magic link.</p>
        <LoginForm />
      </div>
    </main>
  );
}
