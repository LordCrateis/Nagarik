import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, FileText, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { CitizenProfile } from '@workspace/api-client-react';
import { CitizenProfileUrgency, useAnalyzeBenefits, useDetectConflicts, useEvaluateEligibility, useListDemoProfiles, useOptimizeBundle, useSaveCitizenProfile } from '@workspace/api-client-react';
import { BrandMark } from '@/components/BrandMark';
import { DemoDisclaimer, ProcessingNotice, SectionKicker } from '@/components/Primitives';

const initialProfile: CitizenProfile = { name: '', age: 28, gender: 'Prefer not to say', state: '', district: '', occupation: '', annualIncome: 0, familySize: 1, category: 'General', disabilityStatus: false, studentStatus: false, employmentStatus: 'Unemployed', farmerStatus: false, housingStatus: 'Renting', maritalStatus: 'Single', landSize: null, urgency: CitizenProfileUrgency.medium, availableDocuments: [] };
const documents = ['Aadhaar / identity proof', 'Income certificate', 'Residence proof', 'Bank account details', 'Caste certificate', 'Disability certificate', 'Land ownership record'];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">{label}{hint && <span title={hint} className="text-[hsl(var(--muted-foreground))]"><CircleHelp size={13} /></span>}</span>{children}</label>;
}

const inputClass = 'w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-sm outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.1)]';

export default function WorkspacePage() {
  const [, setLocation] = useLocation();
  const demos = useListDemoProfiles();
  const save = useSaveCitizenProfile();
  const analyze = useAnalyzeBenefits();
  const evaluate = useEvaluateEligibility();
  const conflicts = useDetectConflicts();
  const optimize = useOptimizeBundle();
  const [profile, setProfile] = useState<CitizenProfile>(initialProfile);
  const [activeStep, setActiveStep] = useState(1);
  const [error, setError] = useState('');
  const [demoLabel, setDemoLabel] = useState('');

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  useEffect(() => {
    const demoId = params.get('demo');
    const demo = demos.data?.find((item) => item.id === demoId);
    if (demo) {
      setProfile(demo);
      setDemoLabel(demo.label);
    }
  }, [demos.data, params]);

  const update = (key: keyof CitizenProfile, value: string | number | boolean | null) => setProfile((current) => ({ ...current, [key]: value }));
  const setDocument = (document: string) => setProfile((current) => ({ ...current, availableDocuments: current.availableDocuments.includes(document) ? current.availableDocuments.filter((item) => item !== document) : [...current.availableDocuments, document] }));

  const runSupportingAnalysis = (nextProfile: CitizenProfile) => {
    evaluate.mutate({ data: nextProfile }, {
      onSuccess: (results) => {
        const eligibleSchemeIds = results.filter((result) => result.status === 'eligible').map((result) => result.schemeId);
        conflicts.mutate({ data: { eligibleSchemeIds } }, {
          onSuccess: (foundConflicts) => optimize.mutate({ data: { profile: nextProfile, eligibleSchemeIds, conflicts: foundConflicts } }),
        });
      },
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!profile.name.trim() || !profile.state.trim() || !profile.district.trim()) {
      setError('Please add your name, state, and district so the analysis has enough context.');
      setActiveStep(1);
      return;
    }
    save.mutate({ data: profile }, {
      onSuccess: (saved) => {
        runSupportingAnalysis(profile);
        analyze.mutate({ data: profile }, {
          onSuccess: (result) => {
            sessionStorage.setItem('jansahay-analysis', JSON.stringify(result));
            sessionStorage.setItem('jansahay-profile', JSON.stringify(saved.profile));
            setLocation('/app/results');
          },
          onError: () => setError('We could not complete this analysis. Your profile was saved; please try again.'),
        });
      },
      onError: () => setError('We could not save this profile. Please check your connection and try again.'),
    });
  };

  const pending = save.isPending || analyze.isPending || evaluate.isPending || conflicts.isPending || optimize.isPending;
  return <div className="grain min-h-[100dvh] bg-[hsl(var(--background))]">
    <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10"><Link href="/" data-testid="link-back-home"><BrandMark /></Link><div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]"><span className="hidden sm:inline">Private to this session</span><span className="grid size-7 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileText size={14} /></span></div></div></header>
    <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
      <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><SectionKicker>Benefit navigator</SectionKicker><h1 className="font-display text-4xl font-bold tracking-[-.045em] sm:text-5xl">Let’s start with<br /><span className="text-[hsl(var(--primary))]">your situation.</span></h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Answer what you know. JanSahay will explain what may fit — not just return a list of names.</p></div><DemoDisclaimer compact /></div>
      <div className="mb-8 grid grid-cols-3 gap-2 sm:max-w-xl">{['Basics', 'Situation', 'Documents'].map((step, index) => <button key={step} type="button" onClick={() => setActiveStep(index + 1)} className={`group flex items-center gap-2 border-b-2 pb-3 text-left text-sm font-semibold transition-colors ${activeStep === index + 1 ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`} data-testid={`button-step-${index + 1}`}><span className={`grid size-6 place-items-center rounded-full text-xs ${activeStep === index + 1 ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))]'}`}>{index + 1}</span>{step}</button>)}</div>
      {demoLabel && <div className="mb-6 flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary)/.55)] px-4 py-3 text-sm" data-testid="status-demo-loaded"><Sparkles size={16} className="text-[hsl(var(--accent-foreground))]" /><span>Demo profile loaded: <strong>{demoLabel}</strong></span><button type="button" onClick={() => { setProfile(initialProfile); setDemoLabel(''); }} className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))]" data-testid="button-clear-demo"><RotateCcw size={13} /> Start fresh</button></div>}
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_12px_40px_hsl(var(--primary)/.04)] sm:p-8">
          {activeStep === 1 && <div className="animate-rise-in space-y-6"><div><h2 className="font-display text-2xl font-bold">The basics</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Enough to locate the right rules and thresholds.</p></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Your name"><input className={inputClass} value={profile.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Meena Kumari" data-testid="input-name" /></Field><Field label="Age"><input className={inputClass} type="number" min={0} max={120} value={profile.age} onChange={(e) => update('age', Number(e.target.value))} data-testid="input-age" /></Field><Field label="State"><input className={inputClass} value={profile.state} onChange={(e) => update('state', e.target.value)} placeholder="e.g. Rajasthan" data-testid="input-state" /></Field><Field label="District"><input className={inputClass} value={profile.district} onChange={(e) => update('district', e.target.value)} placeholder="e.g. Jaipur" data-testid="input-district" /></Field><Field label="Gender"><select className={inputClass} value={profile.gender} onChange={(e) => update('gender', e.target.value)} data-testid="select-gender"><option>Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary</option></select></Field><Field label="Social category"><select className={inputClass} value={profile.category} onChange={(e) => update('category', e.target.value)} data-testid="select-category"><option>General</option><option>SC</option><option>ST</option><option>OBC</option><option>EWS</option></select></Field></div></div>}
          {activeStep === 2 && <div className="animate-rise-in space-y-6"><div><h2 className="font-display text-2xl font-bold">Your situation</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">These answers help us spot eligibility and combinations.</p></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Occupation"><input className={inputClass} value={profile.occupation} onChange={(e) => update('occupation', e.target.value)} placeholder="e.g. Tailor, student, farmer" data-testid="input-occupation" /></Field><Field label="Annual household income" hint="Use your best estimate in rupees."><input className={inputClass} type="number" min={0} value={profile.annualIncome || ''} onChange={(e) => update('annualIncome', Number(e.target.value))} placeholder="₹ 0" data-testid="input-income" /></Field><Field label="Family members"><input className={inputClass} type="number" min={1} max={20} value={profile.familySize} onChange={(e) => update('familySize', Number(e.target.value))} data-testid="input-family-size" /></Field><Field label="Employment status"><select className={inputClass} value={profile.employmentStatus} onChange={(e) => update('employmentStatus', e.target.value)} data-testid="select-employment"><option>Unemployed</option><option>Self-employed</option><option>Salaried</option><option>Casual worker</option><option>Retired</option></select></Field><Field label="Housing"><select className={inputClass} value={profile.housingStatus} onChange={(e) => update('housingStatus', e.target.value)} data-testid="select-housing"><option>Renting</option><option>Own home</option><option>Homeless</option><option>Temporary housing</option></select></Field><Field label="Marital status"><select className={inputClass} value={profile.maritalStatus} onChange={(e) => update('maritalStatus', e.target.value)} data-testid="select-marital"><option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option></select></Field><div className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">What describes you?</span><div className="grid gap-2 sm:grid-cols-3">{[['studentStatus', 'I am a student'], ['farmerStatus', 'I am a farmer'], ['disabilityStatus', 'I have a disability']].map(([key, label]) => <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${profile[key as keyof CitizenProfile] ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.6)]' : 'border-[hsl(var(--border))]'}`}><input type="checkbox" checked={Boolean(profile[key as keyof CitizenProfile])} onChange={(e) => update(key as keyof CitizenProfile, e.target.checked)} className="size-4 accent-[hsl(var(--primary))]" data-testid={`checkbox-${key}`} />{label}</label>)}</div></div></div></div>}
          {activeStep === 3 && <div className="animate-rise-in space-y-6"><div><h2 className="font-display text-2xl font-bold">Documents you have</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">No uploads needed. Tick what is already within reach.</p></div><div className="grid gap-3 sm:grid-cols-2">{documents.map((document) => <label key={document} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition-all ${profile.availableDocuments.includes(document) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.55)]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent))]'}`}><span className={`grid size-5 place-items-center rounded-md border ${profile.availableDocuments.includes(document) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--input))]'}`}><input type="checkbox" checked={profile.availableDocuments.includes(document)} onChange={() => setDocument(document)} className="sr-only" data-testid={`checkbox-document-${document}`} />{profile.availableDocuments.includes(document) && <Check size={13} strokeWidth={3} />}</span>{document}</label>)}</div><Field label="How urgent is your need?"><div className="grid grid-cols-3 gap-2">{(['low', 'medium', 'high'] as const).map((urgency) => <button type="button" key={urgency} onClick={() => update('urgency', urgency)} className={`rounded-xl border px-3 py-3 text-sm font-semibold capitalize ${profile.urgency === urgency ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))]'}`} data-testid={`button-urgency-${urgency}`}>{urgency}</button>)}</div></Field></div>}
          {error && <p className="mt-6 rounded-xl bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]" data-testid="text-form-error">{error}</p>}
          <div className="mt-9 flex flex-col-reverse justify-between gap-3 border-t border-[hsl(var(--border))] pt-6 sm:flex-row"><button type="button" onClick={() => activeStep > 1 && setActiveStep(activeStep - 1)} className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-40" disabled={activeStep === 1 || pending} data-testid="button-previous-step"><ArrowLeft size={16} /> Previous</button>{activeStep < 3 ? <button type="button" onClick={() => setActiveStep(activeStep + 1)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-next-step">Continue <ArrowRight size={16} /></button> : <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-70" data-testid="button-analyze">{pending ? <><LoaderCircle size={16} className="animate-spin" /> Building your plan</> : <>Find my possible benefits <ArrowRight size={16} /></>}</button>}</div>
        </div>
        <aside className="space-y-4"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="flex items-center gap-2 text-sm font-bold"><span className="grid size-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Sparkles size={16} /></span> What you’ll get</div><ul className="mt-5 space-y-4 text-sm text-[hsl(var(--muted-foreground))]"><li className="flex gap-2"><Check size={16} className="shrink-0 text-[hsl(var(--primary))]" />A clear eligibility readout</li><li className="flex gap-2"><Check size={16} className="shrink-0 text-[hsl(var(--primary))]" />Compatible benefit bundle</li><li className="flex gap-2"><Check size={16} className="shrink-0 text-[hsl(var(--primary))]" />Documents to find first</li></ul></div><div className="rounded-2xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]"><p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))]">Your information</p><p className="mt-3 text-sm leading-relaxed text-[hsl(var(--primary-foreground)/.75)]">Stays private to this prototype session and is used only to create your analysis.</p></div>{pending && <ProcessingNotice />}</aside>
      </form>
    </main>
  </div>;
}