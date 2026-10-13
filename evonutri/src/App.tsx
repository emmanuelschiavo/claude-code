import { Apple, CalendarDays, LayoutDashboard, Leaf, Menu, Settings, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cx } from './components/ui';
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
  { path: '/alimentos', label: 'Alimentos', icon: Apple, match: ['foods'] },
  { path: '/config', label: 'Configurações', icon: Settings, match: ['settings'] },
] as const;

export default function App() {
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [route]);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Barra superior mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Brand />
        <button type="button" aria-label="Abrir menu" onClick={() => setMenuOpen((v) => !v)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-slate-200 bg-white px-3 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen',
          menuOpen ? 'flex' : 'hidden',
        )}
      >
        <div className="mb-6 px-3">
          <Brand />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ path, label, icon: Icon, match }) => {
            const active = (match as readonly string[]).includes(route.name);
            return (
              <a
                key={path}
                href={`#${path}`}
                className={cx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <Icon size={18} />
                {label}
              </a>
            );
          })}
        </nav>
        <p className="mt-auto px-3 text-xs text-slate-400">Dados salvos neste navegador. Faça backup em Configurações.</p>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {route.name === 'dashboard' && <DashboardView />}
          {route.name === 'patients' && <PatientsView />}
          {route.name === 'patient' && <PatientProfileView id={route.id} tab={route.tab} />}
          {route.name === 'finance' && <FinanceView />}
          {route.name === 'foods' && <FoodsView />}
          {route.name === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <a href="#/" className="flex items-center gap-2">
      <span className="rounded-lg bg-emerald-600 p-1.5 text-white">
        <Leaf size={18} />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-800">
        Evo<span className="text-emerald-600">Nutri</span>
      </span>
    </a>
  );
}
