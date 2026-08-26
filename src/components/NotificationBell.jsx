import React, { useState, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, Calendar, Users, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const NotificationBell = () => {
  const { state } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeAlerts = state.alerts.filter(a => a.status !== 'read');
  const count = activeAlerts.length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'red-flag': return <AlertTriangle size={18} className="text-danger" style={{ color: 'var(--color-danger-600)' }} />;
      case 'appointment': return <Calendar size={18} className="text-primary" style={{ color: 'var(--color-primary-600)' }} />;
      case 'referral': return <Users size={18} className="text-accent" style={{ color: 'var(--color-accent-600)' }} />;
      default: return <Bell size={18} />;
    }
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button 
        className="btn btn-ghost btn-icon" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'relative' }}
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="notification-count">{count}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="p-4 border-b flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-neutral-200)' }}>
            <h3 className="font-semibold text-sm">Notifications</h3>
            {count > 0 && <span className="badge badge-primary">{count} New</span>}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {activeAlerts.length === 0 ? (
              <div className="p-6 text-center text-muted text-sm">
                No new notifications
              </div>
            ) : (
              activeAlerts.map(alert => (
                <div key={alert.id} className="notification-item unread">
                  <div className="mt-1 flex-shrink-0">
                    {getIcon(alert.type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">
                      {alert.type === 'red-flag' ? 'Red Flag Alert!' : 'New Update'}
                    </div>
                    <div className="text-xs text-muted mb-2 line-clamp-2">
                      {alert.message}
                    </div>
                    <div className="text-xs text-muted" style={{ fontSize: '10px' }}>
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
