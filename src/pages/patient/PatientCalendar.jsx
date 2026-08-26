import React, { useState } from 'react';
import Calendar from '../../components/Calendar';
import { Clock, MapPin, User, Stethoscope } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';

const PatientCalendar = () => {
  const { state } = useAppContext();
  const t = useTranslation(state.language);
  const patient = state.currentUser;
  
  const [selectedDateStr, setSelectedDateStr] = useState(null);

  const appointments = state.appointments.filter(a => a.patientId === patient?.id);
  
  const selectedAppointments = selectedDateStr 
    ? appointments.filter(a => a.date === selectedDateStr)
    : appointments.filter(a => new Date(a.date) >= new Date('2026-08-01')).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 3); // Default show upcoming

  return (
    <div className="layout-sidebar-right gap-8">
      <div className="flex-1 max-w-[600px]">
        <div className="page-header">
          <h1 className="page-title">{t('appointments')}</h1>
          <p className="page-subtitle">View and manage your OPD visits.</p>
        </div>
        
        <Calendar appointments={appointments} onSelectDate={setSelectedDateStr} />
      </div>

      <div className="sidebar-panel">
        <div className="card h-full bg-neutral-50" style={{ background: 'var(--color-neutral-50)' }}>
          <h2 className="heading-4 mb-6">
            {selectedDateStr 
              ? `${t('date')} - ${new Date(selectedDateStr).toLocaleDateString(state.language === 'en' ? 'en-US' : 'hi-IN', { month: 'short', day: 'numeric' })}` 
              : t('upcoming_appointments')
            }
          </h2>
          
          <div className="space-y-4">
            {selectedAppointments.length === 0 ? (
              <div className="text-muted text-sm text-center py-8">{t('no_appointments')}</div>
            ) : (
              selectedAppointments.map(apt => {
                const doc = state.doctors.find(d => d.id === apt.doctorId);
                return (
                  <div key={apt.id} className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: 'var(--color-neutral-200)' }}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="badge badge-primary uppercase">{apt.type}</div>
                      <div className={`badge ${apt.status === 'scheduled' ? 'badge-warning' : 'badge-success'}`}>
                        {apt.status}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2 text-primary-700 font-bold text-lg" style={{ color: 'var(--color-primary-700)' }}>
                      <Clock size={18} /> {apt.time}
                    </div>
                    
                    <div className="text-sm font-medium mb-1">{new Date(apt.date).toLocaleDateString(state.language === 'en' ? 'en-US' : 'hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    
                    <div className="border-t my-3" style={{ borderTop: '1px solid var(--color-neutral-100)' }}></div>
                    
                    <div className="space-y-2 text-sm text-neutral-600" style={{ color: 'var(--color-neutral-600)' }}>
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-neutral-400" />
                        <span className="font-medium text-neutral-800">{doc?.name || apt.doctorId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope size={16} className="text-neutral-400" />
                        <span>{apt.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-neutral-400" />
                        <span>AIIMS New Delhi, OPD Block B</span>
                      </div>
                    </div>
                    
                    {apt.status === 'scheduled' && (
                      <div className="mt-4 flex gap-2">
                        <button className="btn btn-secondary btn-sm flex-1">Reschedule</button>
                        <button className="btn btn-ghost btn-sm text-danger" style={{ color: 'var(--color-danger-600)' }} onClick={() => {}}>{t('cancel')}</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientCalendar;
