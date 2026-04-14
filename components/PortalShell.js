'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const workspaceConfig = {
  student: {
    label: 'Student',
    icon: GraduationCap,
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/result/'),
      },
    ],
  },
  lecturer: {
    label: 'Lecturer',
    icon: ShieldCheck,
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/dashboard/exams/'),
      },
      {
        href: '/create-exam',
        label: 'Create Exam',
        icon: FilePlus2,
        match: (pathname) => pathname === '/create-exam',
      },
    ],
  },
};

function WorkspaceSidebar({
  user,
  pathname,
  onNavigate,
  onLogout,
  collapsed = false,
  onToggleCollapse,
  showCollapseToggle = false,
}) {
  const config = workspaceConfig[user?.role] || workspaceConfig.student;

  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-slate-950 text-white">
      <div className="flex items-center justify-between px-4 py-5">
        <div className={cn('min-w-0', collapsed && 'hidden')}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Navigation
          </p>
          <p className="mt-2 text-sm text-slate-400">{config.summary}</p>
        </div>

        {showCollapseToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      <div className={cn('flex-1 px-4 pb-6', collapsed && 'px-3')}>
        
        <nav className="mt-4 space-y-2">
          {config.items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = item.match(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'block rounded-2xl border transition-all',
                  collapsed ? 'px-3 py-3' : 'px-4 py-4',
                  isActive
                    ? 'border-white/20 bg-white text-slate-950 shadow-lg'
                    : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-700 hover:bg-slate-900'
                )}
              >
                <div
                  className={cn(
                    'flex gap-3',
                    collapsed ? 'items-center justify-center' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-xl p-2',
                      isActive ? 'bg-slate-950/10' : 'bg-white/5'
                    )}
                  >
                    <ItemIcon className="h-4 w-4" />
                  </div>
                  <div className={cn(collapsed && 'hidden')}>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p
                      className={cn(
                        'mt-1 text-sm',
                        isActive ? 'text-slate-700' : 'text-slate-400'
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={cn('border-t border-slate-800 px-6 py-6', collapsed && 'px-3')}>
        <div
          className={cn(
            'rounded-2xl border border-slate-800 bg-slate-900/60 p-4',
            collapsed && 'flex justify-center p-3'
          )}
        >
          <div className={cn(collapsed && 'hidden')}>
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="mt-1 text-sm text-slate-400">{user?.email}</p>
          </div>
          <div
            className={cn(
              'hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white',
              collapsed && 'flex'
            )}
            aria-hidden={!collapsed}
          >
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
        </div>

        <Button
          variant="secondary"
          className={cn(
            'mt-4 bg-white text-slate-950 hover:bg-slate-200',
            collapsed ? 'w-full justify-center px-0' : 'w-full justify-start'
          )}
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className={cn('h-4 w-4', !collapsed && 'mr-2')} />
          <span className={cn(collapsed && 'sr-only')}>Logout</span>
        </Button>
      </div>
    </div>
  );
}

export default function PortalShell({
  title,
  description,
  actions,
  children,
  contentClassName,
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const config = workspaceConfig[user?.role] || workspaceConfig.student;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem('portal-sidebar-collapsed');
    if (stored === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((current) => {
      const next = !current;

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('portal-sidebar-collapsed', String(next));
      }

      return next;
    });
  };

  const handleNavigate = () => {
    setMobileOpen(false);
  };

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.18),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'sticky top-0 hidden h-screen border-r border-slate-200 bg-slate-950 transition-[width] duration-300 md:block',
            sidebarCollapsed ? 'w-24' : 'w-80'
          )}
        >
          <WorkspaceSidebar
            user={user}
            pathname={pathname}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
            showCollapseToggle
          />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-start gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="mt-1 md:hidden"
                      aria-label="Open sidebar"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 border-r p-0">
                    <SheetHeader className="sr-only">
                      <SheetTitle>{config.label} navigation</SheetTitle>
                      <SheetDescription>
                        Open the sidebar navigation for this workspace.
                      </SheetDescription>
                    </SheetHeader>
                    <WorkspaceSidebar
                      user={user}
                      pathname={pathname}
                      onNavigate={handleNavigate}
                      onLogout={handleLogout}
                    />
                  </SheetContent>
                </Sheet>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {config.label} 
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-950">{title}</h1>
                  {description ? (
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
                  ) : null}
                </div>
              </div>

              {actions ? (
                <div className="flex flex-wrap items-center gap-3">{actions}</div>
              ) : null}
            </div>
          </header>

          <main className={cn('flex-1 w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8', contentClassName)}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
