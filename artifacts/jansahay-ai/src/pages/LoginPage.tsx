import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { AuthField, AuthShell, authInputClass } from '@/components/AuthShell';
import { logIn } from '@/lib/auth';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter both your email and password.');
      return;
    }
    setPending(true);
    try {
      await logIn(email, password);
      setLocation('/app');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not log you in.');
    } finally {
      setPending(false);
    }
  };

  return <AuthShell eyebrow="Welcome back" title={<>Continue your<br /><span className="text-[hsl(var(--accent))]">support journey.</span></>} description="Return to the profile you already created and continue from the information Nagarik remembers on this browser." points={['Resume without entering basic details again', 'Keep one profile for future scheme checks', 'Review sourced schemes in one place']}>
    <div className="flex min-h-full items-center p-6 sm:p-10 lg:p-12">
      <div className="mx-auto w-full max-w-md animate-rise-in">
        <span className="grid size-11 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><LockKeyhole size={20} /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">Log in</p>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-[-.04em]">Good to see you again.</h2>
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Use the account created on this browser to open your Nagarik workspace.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <AuthField label="Email address"><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={authInputClass} placeholder="you@example.com" data-testid="input-login-email" /></AuthField>
          <AuthField label="Password"><div className="relative"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${authInputClass} pr-11`} placeholder="Your password" data-testid="input-login-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></AuthField>
          {error && <p className="rounded-xl bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]" role="alert" data-testid="text-login-error">{error}</p>}
          <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-login-submit">{pending ? <><LoaderCircle size={16} className="animate-spin" /> Checking account</> : <>Open my workspace <ArrowRight size={16} /></>}</button>
        </form>
        <p className="mt-7 text-center text-sm text-[hsl(var(--muted-foreground))]">New to Nagarik? <Link href="/create-account" className="font-bold text-[hsl(var(--primary))] hover:underline">Create your account</Link></p>
      </div>
    </div>
  </AuthShell>;
}
