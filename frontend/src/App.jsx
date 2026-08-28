import React, { useState } from 'react';
import PatientKiosk from './components/PatientKiosk';
import DoctorCommandCenter from './components/DoctorCommandCenter';
import { Stethoscope, User, Activity, ShieldCheck, HeartPulse } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('kiosk'); // 'kiosk' or 'doctor'
  const [activeSessionId, setActiveSessionId] = useState(null);

  return (
    <div>
      {/* Hospital App Header */}
      <header className="app-header">
        <div className="brand-container">
          <div className="brand-logo">
            <HeartPulse size={24} color="#ffffff" />
          </div>
          <div>
            <div className="brand-title">MediKiosk</div>
            <div className="brand-subtitle">Smart OPD Pre-Consultation Platform</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '20px', fontWeight: 700 }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>ABDM Connected</span>
          </div>

          {/* View Switcher Tabs */}
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'kiosk' ? 'active' : ''}`}
              onClick={() => setActiveTab('kiosk')}
            >
              <User size={18} />
              <span>Patient Kiosk</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'doctor' ? 'active' : ''}`}
              onClick={() => setActiveTab('doctor')}
            >
              <Stethoscope size={18} />
              <span>Doctor Command Center</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Content View */}
      <main className="app-container">
        {activeTab === 'kiosk' ? (
          <PatientKiosk 
            activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId}
            onSessionComplete={() => {}}
          />
        ) : (
          <DoctorCommandCenter 
            activeSessionId={activeSessionId}
          />
        )}
      </main>
    </div>
  );
}
