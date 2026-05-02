'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserCog,
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
import ThemeToggle from '@/components/ThemeToggle';

const workspaceConfig = {
  student: {
    label: 'Student',
    icon: GraduationCap,
    summary: 'Track your assessments and stay exam-ready.',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/result/'),
        description: 'Overview of available and completed exams.',
      },
      {
        href: '/dashboard/profile',
        label: 'Profile & Settings',
        icon: UserCog,
        match: (pathname) => pathname === '/dashboard/profile',
        description: 'Manage account details and security settings.',
      },
    ],
  },
  lecturer: {
    label: 'Lecturer',
    icon: ShieldCheck,
    summary: 'Manage exam lifecycle, questions, and performance.',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/dashboard/exams/'),
        description: 'Monitor and manage published assessments.',
      },
      {
        href: '/create-exam',
        label: 'Create Exam',
        icon: FilePlus2,
        match: (pathname) => pathname === '/create-exam',
        description: 'Build a new exam and publish when ready.',
      },
      {
        href: '/dashboard/profile',
        label: 'Profile & Settings',
        icon: UserCog,
        match: (pathname) => pathname === '/dashboard/profile',
        description: 'Update account profile and credentials.',
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
    <div className="flex h-screen flex-col overflow-y-auto bg-card text-card-foreground">
      <div className="flex items-center justify-between px-4 py-5">
        <div className={cn('min-w-0', collapsed && 'hidden')}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Navigation
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{config.summary}</p>
        </div>

        {showCollapseToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-10 w-10 rounded-2xl border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                    ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-muted/40 text-foreground hover:border-border hover:bg-accent'
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
                      isActive ? 'bg-primary-foreground/15' : 'bg-background/60'
                    )}
                  >
                    <ItemIcon className="h-4 w-4" />
                  </div>
                  <div className={cn(collapsed && 'hidden')}>
                    <p className="text-sm font-semibold">{item.label}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={cn('border-t border-border px-6 py-6', collapsed && 'px-3')}>
        <div
          className={cn(
            'rounded-2xl border border-border bg-muted/40 p-4',
            collapsed && 'flex justify-center p-3'
          )}
        >
          <div className={cn(collapsed && 'hidden')}>
            <p className="text-sm font-semibold text-foreground">{user?.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div
            className={cn(
              'hidden h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground',
              collapsed && 'flex'
            )}
            aria-hidden={!collapsed}
          >
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
        </div>

        <Button
          variant="outline"
          className={cn(
            'mt-4',
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
  const showThemeToggle = pathname === '/dashboard';

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
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'sticky top-0 hidden h-screen border-r border-border bg-card transition-[width] duration-300 md:block',
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
          <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
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
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    {config.label} 
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-foreground">{title}</h1>
                  {description ? (
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {showThemeToggle ? <ThemeToggle /> : null}
                {actions}
              </div>
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
