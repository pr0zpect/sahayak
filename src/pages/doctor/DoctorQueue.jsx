import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';

const DoctorQueue = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const t = useTranslation(state.language);
  const doctor = state.currentUser;

  const [activeTab, setActiveTab] = useState('waiting'); // waiting, completed

  const queue = state.queue.filter(q => q.doctorId === doctor?.id);
  const waitingQueue = queue.filter(q => q.status === 'waiting');
  const completedQueue = queue.filter(q => q.status === 'completed');

  const displayQueue = activeTab === 'waiting' ? waitingQueue : completedQueue;

  const handleStartConsultation = (patientId, queueId) => {
    dispatch({ type: 'UPDATE_QUEUE_STATUS', payload: { id: queueId, status: 'in-consultation' } });
    navigate(`/doctor/patient/${patientId}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end mb-2">
        <div className="page-header mb-0">
          <h1 className="page-title">{t('todays_queue')}</h1>
          <p className="page-subtitle">{t('manage_patients')} {new Date().toLocaleDateString(state.language === 'en' ? 'en-US' : 'hi-IN')}</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 border-r" style={{ borderColor: 'var(--color-neutral-200)' }}>
            <div className="text-2xl font-bold text-primary-600" style={{ color: 'var(--color-primary-600)' }}>{waitingQueue.length}</div>
            <div className="text-xs text-muted font-semibold uppercase tracking-wider">{t('waiting')}</div>
          </div>
          <div className="text-center px-4">
            <div className="text-2xl font-bold text-success-600" style={{ color: 'var(--color-success-600)' }}>{completedQueue.length}</div>
            <div className="text-xs text-muted font-semibold uppercase tracking-wider">{t('seen')}</div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'waiting' ? 'active' : ''}`}
          onClick={() => setActiveTab('waiting')}
        >
          {t('waiting_list')}
        </button>
        <button 
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          {t('completed')}
        </button>
      </div>

      <div className="grid gap-4">
        {displayQueue.length === 0 ? (
          <div className="card text-center p-12 text-muted">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <div className="text-lg">{t('no_patients_' + activeTab)}</div>
          </div>
        ) : (
          displayQueue.map((patient, index) => (
            <div key={patient.id} className={`card p-4 flex flex-col md:flex-row items-center gap-6 ${patient.redFlag ? 'border-danger-200 bg-danger-50' : ''}`} style={patient.redFlag ? { borderColor: 'var(--color-danger-200)', background: 'var(--color-danger-50)' } : {}}>
              <div className="text-3xl font-bold text-neutral-300 w-12 text-center" style={{ color: 'var(--color-neutral-300)' }}>
                #{index + 1}
              </div>
              
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
                {patient.avatar || <User size={20} />}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{patient.patientName}</h3>
                  <span className="badge badge-neutral">{patient.tokenNumber}</span>
                  {patient.redFlag && <span className="badge badge-danger"><AlertTriangle size={12} className="mr-1"/> Flagged</span>}
                </div>
                <div className="text-sm font-medium text-neutral-600 mb-1" style={{ color: 'var(--color-neutral-600)' }}>
                  {t('summary_chief_complaint')}: <span className="text-neutral-900" style={{ color: 'var(--color-neutral-900)' }}>{patient.chiefComplaint}</span>
                </div>
                <div className="text-xs text-muted flex items-center gap-1">
                  <Clock size={14} /> Checked in at {patient.checkinTime} • Waiting {patient.waitTime} mins
                </div>
              </div>

              <div>
                {activeTab === 'waiting' ? (
                  <button 
                    className={`btn ${patient.redFlag ? 'btn-danger' : 'btn-accent'} btn-lg w-full md:w-auto`}
                    onClick={() => handleStartConsultation(patient.patientId, patient.id)}
                  >
                    {t('start_consult')} <ArrowRight size={18} />
                  </button>
                ) : (
                  <button 
                    className="btn btn-ghost w-full md:w-auto"
                    onClick={() => navigate(`/doctor/patient/${patient.patientId}`)}
                  >
                    {t('view_file')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorQueue;
