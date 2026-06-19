export function SignOutButton({ dark = false }: { dark?: boolean }) {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className={`transition-base rounded-lg px-3 py-1.5 text-sm font-medium ${
          dark
            ? "text-neutral-400 hover:bg-white/10 hover:text-white"
            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        }`}
      >
        Sign out
      </button>
    </form>
  );
}
