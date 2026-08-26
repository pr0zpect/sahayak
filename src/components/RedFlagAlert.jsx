import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../data/i18n';

const RedFlagAlert = () => {
  const { state } = useAppContext();
  const t = useTranslation(state.language);
  const [activeAlert, setActiveAlert] = useState(null);

  useEffect(() => {
    // Only show full screen overlay for Patient role if there is a new unread red flag
    if (state.currentUser?.role === 'patient') {
      const recentFlag = state.alerts.find(a => a.type === 'red-flag' && a.status === 'active');
      
      // Prevent showing on initial load if we already saw it (hacky but works for demo)
      if (recentFlag && !activeAlert) {
        setActiveAlert(recentFlag);
        
        // Auto dismiss after 8 seconds
        const timer = setTimeout(() => {
          setActiveAlert(null);
        }, 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [state.alerts, state.currentUser, activeAlert]);

  if (!activeAlert) return null;

  return (
    <div className="red-flag-overlay">
      <div className="red-flag-modal">
        <button 
          className="absolute top-4 right-4 text-white opacity-70 hover:opacity-100 transition-opacity"
          onClick={() => setActiveAlert(null)}
        >
          <X size={24} />
        </button>
        
        <div className="red-flag-icon">
          <AlertTriangle size={64} className="text-white" />
        </div>
        
        <h2 className="red-flag-title">{t('red_flag_alert')}</h2>
        <p className="red-flag-message">{t('red_flag_msg')}</p>
        
        <div className="mt-8 text-sm opacity-90 bg-black/20 px-6 py-3 rounded-xl backdrop-blur-sm border border-white/10">
          <span className="font-bold">Reason:</span> {activeAlert.message}
        </div>
      </div>
    </div>
  );
};

export default RedFlagAlert;
