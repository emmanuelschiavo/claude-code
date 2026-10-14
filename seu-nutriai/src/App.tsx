import { Apple, CalendarDays, LayoutDashboard, Menu, Settings, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrandMark } from './components/BrandMark';
import { ObsidianPill } from './components/ObsidianPanel';
import { ToastHost } from './components/Toasts';
import { ConfirmHost, cx } from './components/ui';
import { useDb } from './lib/store';
import { DashboardView } from './views/DashboardView';
import { FinanceView } from './views/FinanceView';
import { FoodsView } from './views/FoodsView';
import { PatientProfileView } from './views/PatientProfileView';
import { PatientsView } from './views/PatientsView';
import { SettingsView } from './views/SettingsView';

// Rotas por hash: #/, #/pacientes, #/pacientes/:id/:aba, #/agenda, #/alimentos, #/config
export type Route =
  | { name: 'dashboard' }
  | { name: 'patients' }
  | { name: 'patient'; id: string; tab?: string }
  | { name: 'finance' }
  | { name: 'foods' }
  | { name: 'settings' };

function parseHash(hash: string): Route {
  const [, a, b, c] = hash.replace(/^#/, '').split('/');
  if (a === 'pacientes' && b) return { name: 'patient', id: b, tab: c };
  if (a === 'pacientes') return { name: 'patients' };
  if (a === 'agenda') return { name: 'finance' };
  if (a === 'alimentos') return { name: 'foods' };
  if (a === 'config') return { name: 'settings' };
  return { name: 'dashboard' };
}

export function navigate(path: string) {
  window.location.hash = path;
}

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

const NAV = [
  { path: '/', label: 'Painel', icon: LayoutDashboard, match: ['dashboard'] },
  { path: '/pacientes', label: 'Pacientes', icon: Users, match: ['patients', 'patient'] },
  { path: '/agenda', label: 'Agenda e financeiro', icon: CalendarDays, match: ['finance'] },
  { path: '/alimentos', label: 'Banco de alimentos', icon: Apple, match: ['foods'] },
  { path: '/config', label: 'Configurações', icon: Settings, match: ['settings'] },
] as const;

export default function App() {
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = useDb((db) => db.profile);

  useEffect(() => setMenuOpen(false), [route]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Barra superior mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-brand-950 px-4 py-3 lg:hidden">
        <BrandMark />
        <button type="button" aria-label="Abrir menu" onClick={() => setMenuOpen((v) => !v)} className="rounded-lg p-1.5 text-brand-100 hover:bg-white/10">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 w-68 flex-col bg-brand-950 px-4 py-6 text-brand-100 lg:sticky lg:top-0 lg:flex lg:h-screen',
          menuOpen ? 'flex' : 'hidden',
        )}
      >
        <div className="mb-10 px-2">
          <BrandMark />
        </div>
        <p className="mb-2 px-3 text-[0.68rem] font-semibold tracking-[0.16em] text-brand-300/70 uppercase">Consultório</p>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ path, label, icon: Icon, match }) => {
            const active = (match as readonly string[]).includes(route.name);
            return (
              <a
                key={path}
                href={`#${path}`}
                className={cx(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active ? 'bg-white/10 text-white' : 'text-brand-200/80 hover:bg-white/5 hover:text-white',
                )}
              >
                {active && <span className="absolute top-1/2 -left-4 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gold-400" />}
                <Icon size={18} className={active ? 'text-gold-300' : undefined} />
                {label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto" />
        <ObsidianPill />
        <a href="#/config" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 font-display text-sm font-semibold text-brand-950">
            {(profile?.name || 'N').trim().charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{profile?.name || 'Seu perfil'}</span>
            <span className="block truncate text-xs text-brand-300">{profile?.crn ? `CRN ${profile.crn}` : 'Complete seus dados'}</span>
          </span>
        </a>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-brand-950/50 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {route.name === 'dashboard' && <DashboardView />}
          {route.name === 'patients' && <PatientsView />}
          {route.name === 'patient' && <PatientProfileView id={route.id} tab={route.tab} />}
          {route.name === 'finance' && <FinanceView />}
          {route.name === 'foods' && <FoodsView />}
          {route.name === 'settings' && <SettingsView />}
        </div>
      </main>
      <ConfirmHost />
      <ToastHost />
    </div>
  );
}
