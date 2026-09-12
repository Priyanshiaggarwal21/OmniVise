import React from 'react';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardTopBar from '../../components/layout/DashboardTopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex selection:bg-[#0B5C48]/10 selection:text-[#0B5C48]">
      {/* Desktop Persistent Left Sidebar */}
      <div className="hidden lg:block shrink-0">
        <DashboardSidebar />
      </div>

      {/* Main Column: Top Bar + Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <DashboardTopBar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
