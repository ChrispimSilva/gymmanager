import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import { useState } from 'react';

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors duration-300"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Desktop Sidebar */}
      <div className="relative flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed left-0 top-0 bottom-0 w-64 z-50 animate-slide-left">
            <Sidebar />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleMobile={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
