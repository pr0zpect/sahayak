import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

const DashboardLayout = ({ role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 'var(--z-sidebar) - 1' }} 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <TopBar role={role} onMenuClick={() => setSidebarOpen(true)} />
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
