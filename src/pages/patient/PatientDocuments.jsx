import React, { useState } from 'react';
import { FileText, FileSignature, Activity, Search, Filter } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';

const PatientDocuments = () => {
  const { state } = useAppContext();
  const t = useTranslation(state.language);
  const patient = state.currentUser;
  
  const [filter, setFilter] = useState('all');

  const docs = state.documents.filter(d => d.patientId === patient?.id);
  const filteredDocs = filter === 'all' ? docs : docs.filter(d => d.type === filter);

  const getIcon = (type) => {
    switch (type) {
      case 'prescription': return <FileSignature size={24} />;
      case 'lab-report': return <Activity size={24} />;
      case 'discharge-summary': return <FileText size={24} />;
      default: return <FileText size={24} />;
    }
  };

  const getIconBg = (type) => {
    switch (type) {
      case 'prescription': return { bg: 'var(--color-success-100)', color: 'var(--color-success-600)' };
      case 'lab-report': return { bg: 'var(--color-accent-100)', color: 'var(--color-accent-600)' };
      case 'discharge-summary': return { bg: 'var(--color-warning-100)', color: 'var(--color-warning-600)' };
      default: return { bg: 'var(--color-neutral-100)', color: 'var(--color-neutral-600)' };
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">{t('documents')}</h1>
          <p className="page-subtitle">{t('docs_desc')}</p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            className="input py-2 h-auto" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{t('all_docs')}</option>
            <option value="prescription">{t('prescriptions')}</option>
            <option value="lab-report">{t('lab_reports')}</option>
            <option value="discharge-summary">{t('discharge_summaries')}</option>
          </select>
          <button className="btn btn-primary">{t('upload_new')}</button>
        </div>
      </div>

      <div className="grid grid-3 gap-6">
        {filteredDocs.map(doc => {
          const colors = getIconBg(doc.type);
          return (
            <div key={doc.id} className="card flex flex-col h-full card-interactive">
              <div className="flex justify-between items-start mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center" 
                  style={{ background: colors.bg, color: colors.color }}
                >
                  {getIcon(doc.type)}
                </div>
                <div className="badge badge-success">{doc.status}</div>
              </div>

              <h3 className="font-bold text-lg mb-1 truncate" title={doc.title}>{doc.title}</h3>
              <div className="text-sm text-neutral-500 mb-4" style={{ color: 'var(--color-neutral-500)' }}>
                {new Date(doc.date).toLocaleDateString()} • {doc.doctor}
              </div>

              <div className="mt-auto pt-4 border-t" style={{ borderTop: '1px solid var(--color-neutral-100)' }}>
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2" style={{ color: 'var(--color-neutral-400)' }}>
                  {t('ai_extracted')}
                </div>
                <div className="space-y-1">
                  {Object.entries(doc.extractedData).slice(0, 3).map(([key, val]) => (
                    <div key={key} className="text-sm flex justify-between gap-4">
                      <span className="text-muted capitalize truncate">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium text-right truncate max-w-[60%]">
                        {Array.isArray(val) ? `${val.length} items` : val}
                      </span>
                    </div>
                  ))}
                  {Object.keys(doc.extractedData).length > 3 && (
                    <div className="text-xs text-primary-600 text-center mt-2" style={{ color: 'var(--color-primary-600)' }}>
                      + {Object.keys(doc.extractedData).length - 3} more fields
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredDocs.length === 0 && (
        <div className="card p-12 text-center text-muted">
          {t('no_docs_filter')}
        </div>
      )}
    </div>
  );
};

export default PatientDocuments;
