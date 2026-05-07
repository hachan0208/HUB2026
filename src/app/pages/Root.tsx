/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Navbar } from "../components/layouts/Navbar";
import { LeftSidebar } from "../components/layouts/LeftSidebar";
import { UiSettingsModal } from "../components/UiSettingsModal";
import { ErrorBoundary } from "../components/shared/ErrorBoundary";

// ── Root không dùng framer-motion để tránh layout thrashing trên shell layout ──
export function Root() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden font-sans text-foreground bg-transparent">
      {/* Mobile Sidebar Overlay — CSS transition thay vì framer-motion */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 bg-black/40 backdrop-blur-md z-[60] lg:hidden transition-opacity duration-300
          ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Sidebar for mobile */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-background border-r border-border z-[70] lg:hidden transform transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <LeftSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative bg-transparent">
        <div className="bg-transparent mx-4 mt-4 relative z-40">
          <Navbar
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>

        <main className="flex-1 flex flex-col min-h-0 relative">
          <ErrorBoundary>
            <div className="flex-1 flex flex-col min-h-0">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>

        <UiSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </div>
  );
}
