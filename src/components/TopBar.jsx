import React from 'react';
import { Menu, User } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../data/i18n';

const TopBar = ({ role, onMenuClick }) => {
  const { state } = useAppContext();
  const t = useTranslation(state.language);
  
  const titles = {
    patient: t('patient_portal'),
    doctor: t('doctor_portal'),
    admin: t('hospital_admin'),
  };

  return (
    <header className="topbar">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-icon" onClick={onMenuClick} style={{ display: 'none' }} id="menu-toggle">
          <Menu size={24} />
        </button>
        
        <h1 className="topbar-title">{titles[role]}</h1>
      </div>
      
      <div className="topbar-actions">
        <NotificationBell />
        
        <div className="flex items-center gap-2 p-1 rounded-xl" style={{ background: 'var(--color-neutral-100)' }}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100 text-primary-700 font-bold" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
            {state.currentUser?.avatar || <User size={18} />}
          </div>
          <div className="px-2 hidden sm:block">
            <div className="text-sm font-semibold">{state.currentUser?.name?.split(' ')[0] || 'User'}</div>
            <div className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{role}</div>
          </div>
        </div>
      </div>
      
      <style>{`
        @media (max-width: 1024px) {
          #menu-toggle { display: flex !important; }
        }
      `}</style>
    </header>
  );
};

export default TopBar;
