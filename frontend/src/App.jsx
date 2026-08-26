import React, { useState } from 'react';
import PatientKiosk from './components/PatientKiosk';
import DoctorCommandCenter from './components/DoctorCommandCenter';
import { Stethoscope, User, Activity } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('kiosk'); // 'kiosk' or 'doctor'
  const [activeSessionId, setActiveSessionId] = useState(null);

  return (
    <div>
      {/* App Header Navigation */}
      <header className="app-header">
        <div className="brand-container">
          <div className="brand-logo">
            <Activity size={24} color="#ffffff" />
          </div>
          <div>
            <div className="brand-title">MediKiosk</div>
            <div className="brand-subtitle">Pre-Consultation Adaptive Intake</div>
          </div>
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
