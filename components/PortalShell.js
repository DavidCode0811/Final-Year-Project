'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpenCheck,
  FilePlus2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';

const workspaceConfig = {
  student: {
    label: 'Student',
    icon: GraduationCap,
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        match: (pathname) => pathname === '/dashboard',
      },
      {
        href: '/dashboard/exams',
        label: 'Exams',
        icon: BookOpenCheck,
        match: (pathname) =>
          pathname === '/dashboard/exams' ||
          pathname.startsWith('/exam/') ||
          pathname.startsWith('/result/'),
      },
      {
        href: '/dashboard/profile',
        label: 'Profile & Settings',
        icon: UserCog,
        match: (pathname) => pathname === '/dashboard/profile',
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
      {
        href: '/dashboard/profile',
        label: 'Profile & Settings',
        icon: UserCog,
        match: (pathname) => pathname === '/dashboard/profile',
      },
    ],
  },
};

function SidebarTooltip({ label, collapsed, children }) {
  if (!collapsed) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center" className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SentinelMark({ collapsed = false }) {
  return (
    <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-background to-cyan-500/10 text-emerald-600 shadow-sm shadow-emerald-500/10 dark:text-emerald-300">
        <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.1} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-cyan-400" />
      </div>

      <div className={cn('min-w-0 transition-opacity duration-200', collapsed && 'hidden opacity-0')}>
        <p className="truncate text-sm font-semibold leading-5 tracking-tight text-foreground">
          Sentinel Exam
        </p>
        <p className="truncate text-[11px] font-medium leading-4 text-muted-foreground">
          Secure assessment OS
        </p>
      </div>
    </div>
  );
}

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
  const RoleIcon = config.icon;
  const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex h-screen flex-col overflow-hidden bg-card/95 text-card-foreground backdrop-blur-xl dark:bg-card/90">
        <div
          className={cn(
            'relative flex items-center px-3 py-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <SentinelMark collapsed={collapsed} />
          {showCollapseToggle ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className={cn(
                'h-8 w-8 rounded-lg border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground',
                collapsed && 'absolute left-[52px] top-4 h-7 w-7'
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          ) : null}
        </div>

        <div className={cn('flex-1 overflow-y-auto px-3 pb-4', collapsed && 'px-2')}>
          <div
            className={cn(
              'mb-3 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/35 px-3 py-2 text-xs font-medium text-muted-foreground',
              collapsed && 'justify-center px-0'
            )}
          >
            <RoleIcon className="h-3.5 w-3.5" />
            <span className={cn(collapsed && 'sr-only')}>{config.label} workspace</span>
          </div>

          <nav className="space-y-1">
            {config.items.map((item) => {
              const ItemIcon = item.icon;
              const isActive = item.match(pathname);

              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex h-10 items-center rounded-xl text-sm font-medium transition-all duration-200',
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                    isActive
                      ? 'bg-emerald-500/10 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.75),0_8px_24px_-18px_hsl(160_84%_39%/0.8)] dark:bg-emerald-400/10'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-emerald-500 transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <ItemIcon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                    strokeWidth={2}
                  />
                  <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
                </Link>
              );

              return (
                <SidebarTooltip key={`${item.href}-${item.label}`} label={item.label} collapsed={collapsed}>
                  {link}
                </SidebarTooltip>
              );
            })}
          </nav>
        </div>

        <div className={cn('border-t border-border/70 px-3 py-3', collapsed && 'px-2')}>
          <div
            className={cn(
              'flex items-center rounded-xl px-2.5 py-2 transition-colors',
              collapsed ? 'justify-center px-0' : 'gap-3 bg-muted/35'
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-foreground shadow-sm">
              {initial}
            </div>
            <div className={cn('min-w-0 flex-1', collapsed && 'sr-only')}>
              <p className="truncate text-sm font-medium leading-5 text-foreground">{user?.name}</p>
              <p className="truncate text-xs leading-4 text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <SidebarTooltip label="Logout" collapsed={collapsed}>
            <Button
              variant="ghost"
              className={cn(
                'mt-2 h-9 rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
                collapsed ? 'w-full justify-center px-0' : 'w-full justify-start px-2.5'
              )}
              onClick={onLogout}
            >
              <LogOut className={cn('h-4 w-4', !collapsed && 'mr-2')} />
              <span className={cn(collapsed && 'sr-only')}>Logout</span>
            </Button>
          </SidebarTooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function PortalShell({
  title,
  description,
  actions,
  children,
  contentClassName,
  showThemeToggle = false,
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
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'sticky top-0 hidden h-screen border-r border-border/70 bg-card/95 shadow-[1px_0_0_hsl(var(--background)/0.65)] transition-[width] duration-300 ease-out md:block',
            sidebarCollapsed ? 'w-[72px]' : 'w-64'
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
                  <SheetContent side="left" className="w-[18rem] border-r p-0">
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
