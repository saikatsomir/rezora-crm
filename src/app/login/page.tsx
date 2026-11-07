import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./form";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center p-5">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <div className="card w-full max-w-md p-8 shadow-xl shadow-primary/5">
        <Logo className="h-9" />
        <h1 className="mt-8 text-xl font-semibold tracking-tight">Sign in to Rezora CRM</h1>
        <p className="mt-1 text-sm text-muted">Private workspace. Authorized team members only.</p>
        <LoginForm />
      </div>
    </main>
  );
}
