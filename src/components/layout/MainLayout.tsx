import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

export default function MainLayout() {
  return (
    <div
      className="flex h-screen w-full max-w-full overflow-hidden transition-colors duration-300"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Desktop Sidebar (visible on md+ screens) */}
      <div className="relative flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-8 w-full">
          <div className="p-4 sm:p-5 md:p-6 lg:p-8 max-w-7xl mx-auto w-full box-border">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Footer Navigation (visible on mobile screens) */}
      <MobileNav />
    </div>
  );
}
