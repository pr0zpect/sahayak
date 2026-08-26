import React from 'react';
import { Stethoscope, Activity, Pill, FileText, ChevronDown } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';
import { MOCK_VISIT_HISTORY } from '../../data/mockData';

const PatientTimeline = () => {
  const { state } = useAppContext();
  const t = useTranslation(state.language);
  const patient = state.currentUser;
  
  // Filter history for current patient and sort descending
  const history = MOCK_VISIT_HISTORY
    .filter(h => h.patientId === patient?.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const getIcon = (type) => {
    switch(type) {
      case 'visit': return <Stethoscope size={16} className="text-primary-600" style={{ color: 'var(--color-primary-600)' }} />;
      case 'lab': return <Activity size={16} className="text-accent-600" style={{ color: 'var(--color-accent-600)' }} />;
      case 'prescription': return <Pill size={16} className="text-success-600" style={{ color: 'var(--color-success-600)' }} />;
      case 'discharge': return <FileText size={16} className="text-warning-600" style={{ color: 'var(--color-warning-600)' }} />;
      default: return <Stethoscope size={16} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">{t('med_timeline')}</h1>
        <p className="page-subtitle">{t('timeline_desc')}</p>
      </div>

      <div className="card p-8">
        {history.length === 0 ? (
          <div className="text-center text-muted py-12">{t('no_history')}</div>
        ) : (
          <div className="timeline mt-4">
            {history.map((record) => (
              <div key={record.id} className="timeline-item">
                <div className={`timeline-dot ${record.type}`}></div>
                
                <div className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--color-neutral-200)' }}>
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-3 border-b pb-3" style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <div>
                      <div className="font-bold text-lg">{record.diagnosis}</div>
                      <div className="text-sm font-medium text-neutral-600 mt-1" style={{ color: 'var(--color-neutral-600)' }}>
                        {record.doctor} • {record.department}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold bg-neutral-100 px-3 py-1 rounded-full text-neutral-600" style={{ background: 'var(--color-neutral-100)', color: 'var(--color-neutral-600)' }}>
                        {new Date(record.date).toLocaleDateString(state.language === 'en' ? 'en-US' : 'hi-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-muted mt-2 capitalize">{record.type} Record</div>
                    </div>
                  </div>

                  <p className="text-sm text-neutral-700 leading-relaxed mb-4" style={{ color: 'var(--color-neutral-700)' }}>
                    {record.summary}
                  </p>

                  {record.details && (
                    <div className="grid grid-3 gap-6 pt-4 border-t" style={{ borderTop: '1px dashed var(--color-neutral-100)' }}>
                      <div>
                        <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2" style={{ color: 'var(--color-neutral-400)' }}>
                          {t('summary_chief_complaint')}
                        </div>
                        <p className="text-sm font-medium">{record.details.chiefComplaint}</p>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2" style={{ color: 'var(--color-neutral-400)' }}>
                          {t('clin_summary')}
                        </div>
                        <p className="text-sm font-medium">{record.details.clinicalFindings}</p>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2" style={{ color: 'var(--color-neutral-400)' }}>
                          {t('prescribed_treatment')}
                        </div>
                        <p className="text-sm font-medium">{record.details.treatment}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientTimeline;
