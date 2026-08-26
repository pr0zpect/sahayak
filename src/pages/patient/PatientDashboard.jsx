import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, Calendar as CalendarIcon, ArrowRight, FileSignature } from 'lucide-react';
import PatientIdCard from '../../components/PatientIdCard';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';

const PatientDashboard = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const t = useTranslation(state.language);
  const patient = state.currentUser;

  if (!patient) return null;

  // Derive stats
  const upcomingAppointments = state.appointments.filter(a => a.patientId === patient.id && a.status === 'scheduled');
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  const recentDocuments = state.documents.filter(d => d.patientId === patient.id).slice(0, 2);

  return (
    <div className="flex flex-col gap-8">
      <div className="page-header mb-0">
        <h1 className="page-title">{t('welcome_back')}, {patient.name.split(' ')[0]}</h1>
      </div>

      <PatientIdCard patient={patient} />

      <div className="grid grid-3 gap-6">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary-100 text-primary-600" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-card-value">{patient.visits}</div>
            <div className="stat-card-label">{t('total_visits')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success-100 text-success-600" style={{ background: 'var(--color-success-100)', color: 'var(--color-success-600)' }}>
            <FileSignature size={24} />
          </div>
          <div>
            <div className="stat-card-value">{patient.activePrescriptions}</div>
            <div className="stat-card-label">{t('active_prescriptions')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-accent-100 text-accent-600" style={{ background: 'var(--color-accent-100)', color: 'var(--color-accent-600)' }}>
            <CalendarIcon size={24} />
          </div>
          <div>
            <div className="stat-card-value">{upcomingAppointments.length}</div>
            <div className="stat-card-label">{t('upcoming_appointments')}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2 gap-8">
        {/* Latest Summary Snapshot */}
        <div className="card">
          <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
            <h2 className="heading-4">{t('latest_intake')}</h2>
            <div className="text-sm text-muted">Aug 25, 2026</div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1" style={{ color: 'var(--color-neutral-400)' }}>{t('summary_chief_complaint')}</div>
              <div className="font-medium">Chest pain radiating to left arm with breathlessness</div>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1" style={{ color: 'var(--color-neutral-400)' }}>{t('summary_red_flags')}</div>
              <div className="flex gap-2">
                <span className="badge badge-danger">Possible ACS</span>
                <span className="badge badge-warning">High BP Risk</span>
              </div>
            </div>
          </div>
          
          <button 
            className="btn btn-ghost w-full mt-6 text-primary-600" 
            style={{ color: 'var(--color-primary-600)' }}
            onClick={() => navigate('/patient/timeline')}
          >
            {t('view_timeline')} <ArrowRight size={16} />
          </button>
        </div>

        {/* Next Appointment / Recent Docs */}
        <div className="flex flex-col gap-6">
          <div className="card bg-neutral-0 border-primary-200" style={{ background: 'var(--color-neutral-0)', borderColor: 'var(--color-primary-200)' }}>
            <h2 className="heading-4 mb-4 text-primary-800" style={{ color: 'var(--color-primary-800)' }}>{t('next_appointment')}</h2>
            {nextAppointment ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-lg">{new Date(nextAppointment.date).toLocaleDateString(state.language === 'en' ? 'en-US' : 'hi-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  <div className="text-primary-600 font-medium" style={{ color: 'var(--color-primary-600)' }}>{nextAppointment.time}</div>
                  <div className="text-sm text-neutral-600 mt-2" style={{ color: 'var(--color-neutral-600)' }}>{nextAppointment.department}</div>
                </div>
                <CalendarIcon size={48} className="text-primary-200" style={{ color: 'var(--color-primary-200)' }} />
              </div>
            ) : (
              <div className="text-muted">{t('no_appointments')}</div>
            )}
          </div>

          <div className="card flex-1">
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-4">{t('recent_documents')}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patient/documents')}>{t('view_all')}</button>
            </div>
            
            <div className="space-y-3">
              {recentDocuments.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 border" style={{ borderColor: 'var(--color-neutral-100)' }}>
                  <div className="w-10 h-10 rounded bg-accent-50 text-accent-600 flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-50)', color: 'var(--color-accent-600)' }}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 truncate">
                    <div className="font-medium text-sm truncate">{doc.title}</div>
                    <div className="text-xs text-muted">{new Date(doc.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {recentDocuments.length === 0 && <div className="text-sm text-muted">{t('no_documents')}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
