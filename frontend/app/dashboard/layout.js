"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Sliders, Settings, User, Menu, X, LogOut, Waves } from "lucide-react";
import { authApi } from "../../lib/api";

export default function DashboardLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // status: 'loading' | 'ok' | 'fail'  — single state keeps hook count stable for HMR
  const [auth, setAuth] = useState({ status: 'loading', user: null });
  const pathname = usePathname();
  const router = useRouter();

  // Fetch current user on mount.
  // After a Google OAuth redirect the cookie can take a moment to propagate,
  // so we retry up to 3 times with increasing delays before giving up.
  useEffect(() => {
    let cancelled = false;

    const tryAuth = async (attempt = 0) => {
      try {
        const user = await authApi.me();
        if (!cancelled) setAuth({ status: 'ok', user });
      } catch {
        if (cancelled) return;
        if (attempt < 3) {
          // Back off: 800ms, 1600ms, 2400ms
          setTimeout(() => tryAuth(attempt + 1), 800 * (attempt + 1));
        } else {
          // Confirmed not authenticated after 3 attempts — go home
          if (!cancelled) setAuth({ status: 'fail', user: null });
          router.push("/");
        }
      }
    };

    tryAuth();
    return () => { cancelled = true; };
  }, [router]);

  const currentUser = auth.user;

  const navigation = [
    { name: "Updates", href: "/dashboard/updates", icon: Bell },
    { name: "Controls", href: "/dashboard/controls", icon: Sliders },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
    { name: "Account", href: "/dashboard/account", icon: User },
  ];

  const getPageTitle = () => {
    const active = navigation.find((item) => pathname?.startsWith(item.href));
    return active ? active.name : "Dashboard";
  };

  // Initials from name (e.g. "John Doe" → "JD")
  const getInitials = (name) => {
    if (!name) return "OP";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Always render the full layout with children so Next.js App Router's
  // internal useMemo count stays stable. Show loading as a full-screen
  // overlay instead of an early return that omits children entirely.
  const isLoading = auth.status === "loading";

  return (
    <div className="min-h-screen bg-white text-black flex font-sans">

      {/* Full-screen auth loading overlay — sits on top, children still mount */}
      {isLoading && (
        <div className="fixed inset-0 bg-brand-slate z-[100] flex flex-col items-center justify-center gap-4">
          <div className="bg-brand-forest p-4 rounded-2xl">
            <Waves className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-brand-moss text-sm font-semibold tracking-widest uppercase animate-pulse">
            Verifying session…
          </p>
        </div>
      )}

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-brand-slate text-white z-50 flex flex-col justify-between border-r border-brand-forest/20 shadow-xl transition-transform duration-300 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div>
          <div className="h-20 px-6 flex items-center justify-between border-b border-brand-forest/10">
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-brand-forest p-2 rounded-xl flex items-center justify-center">
                <Waves className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="font-extrabold tracking-wider text-lg">FPMS</span>
            </Link>

            {/* Close Menu Button (Mobile) */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg bg-brand-forest/20 text-brand-moss hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-8 px-4 space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-brand-forest text-white border-l-4 border-brand-moss shadow-md"
                      : "text-white/80 hover:text-white hover:bg-brand-forest/30"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-brand-moss" : "text-white/60 group-hover:text-white"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer — Real user info */}
        <div className="p-4 border-t border-brand-forest/10">
          <div className="flex items-center justify-between p-3 bg-brand-forest/20 rounded-xl border border-brand-sage/10 mb-3">
            <div className="flex items-center gap-3">
              {currentUser?.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-brand-moss"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand-moss/30 border border-brand-moss flex items-center justify-center text-brand-moss font-bold text-sm">
                  {getInitials(currentUser?.name)}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-white leading-none truncate max-w-[100px]">
                  {currentUser?.name || "Loading..."}
                </p>
                <span className="text-[10px] text-brand-moss font-medium tracking-wide uppercase mt-1 inline-block">
                  {currentUser?.role || "Operator"}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-forest hover:bg-brand-sage text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-300">

        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Hamburger Button (Mobile) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-gray-50 text-black hover:bg-gray-100 transition-colors border border-gray-200/50 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-black">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* User avatar in header on mobile */}
            {currentUser?.picture && (
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-brand-forest/30 md:hidden"
              />
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 md:p-8 bg-white text-black relative z-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
