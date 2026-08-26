import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, Activity, FileText, Calendar as CalendarIcon, User, 
  Users, AlertCircle, Settings, LogOut, Stethoscope, Clock
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../data/i18n';

const Sidebar = ({ role, isOpen, onClose }) => {
  const { state, dispatch } = useAppContext();
  const t = useTranslation(state.language);

  const navItems = {
    patient: [
      { path: '/patient', icon: <Home />, label: t('dashboard') },
      { path: '/patient/timeline', icon: <Activity />, label: t('my_timeline') },
      { path: '/patient/documents', icon: <FileText />, label: t('documents') },
      { path: '/patient/appointments', icon: <CalendarIcon />, label: t('appointments') },
      { path: '/patient/profile', icon: <User />, label: t('profile') },
    ],
    doctor: [
      { path: '/doctor', icon: <Clock />, label: t('todays_queue') },
      { path: '/doctor/search', icon: <User />, label: t('patient_search') },
      { path: '/doctor/calendar', icon: <CalendarIcon />, label: t('my_schedule') },
      { path: '/doctor/referrals', icon: <Users />, label: t('referrals') },
    ],
    admin: [
      { path: '/admin', icon: <Activity />, label: t('analytics') },
      { path: '/admin/queue', icon: <Clock />, label: t('live_queue') },
      { path: '/admin/patients', icon: <User />, label: t('patient_directory') },
      { path: '/admin/doctors', icon: <Stethoscope />, label: t('doctor_directory') },
      { path: '/admin/alerts', icon: <AlertCircle />, label: t('alerts') },
      { path: '/admin/settings', icon: <Settings />, label: t('settings') },
    ],
  };

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Stethoscope size={24} />
        </div>
        <div className="sidebar-logo-text">
          Sahayak
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems[role]?.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className="sidebar-link"
            end={item.path.split('/').length === 2} // Exact match for root paths
            onClick={onClose}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer flex-col gap-4">
        <button className="sidebar-link w-full text-danger" onClick={handleLogout} style={{ color: 'var(--color-danger-600)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span className="sidebar-link-icon"><LogOut size={20} /></span>
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
