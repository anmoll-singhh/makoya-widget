export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button className="text-sm text-neutral-500 hover:text-neutral-900">Sign out</button>
    </form>
  );
}
