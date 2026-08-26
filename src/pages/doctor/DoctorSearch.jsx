import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, FileText } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';

const DoctorSearch = () => {
  const { state } = useAppContext();
  const t = useTranslation(state.language);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filteredPatients = state.patients.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    p.id.toLowerCase().includes(query.toLowerCase()) ||
    p.abhaId.includes(query) ||
    p.phone.includes(query)
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">{t('patient_search')}</h1>
        <p className="page-subtitle">{t('search_desc')}</p>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={24} className="text-neutral-400" />
        </div>
        <input 
          type="text" 
          className="input input-lg pl-12 shadow-sm border-neutral-300"
          style={{ borderColor: 'var(--color-neutral-300)' }}
          placeholder={t('search_placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query && (
        <div className="grid gap-4">
          <div className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2" style={{ color: 'var(--color-neutral-500)' }}>
            {t('search_results')} ({filteredPatients.length})
          </div>
          
          {filteredPatients.length === 0 ? (
            <div className="card text-center p-12 text-muted">{t('no_results')}</div>
          ) : (
            filteredPatients.map(patient => (
              <div key={patient.id} className="card p-4 flex items-center justify-between hover:border-primary-300 transition-colors cursor-pointer" style={{ ':hover': { borderColor: 'var(--color-primary-300)' } }} onClick={() => navigate(`/doctor/patient/${patient.id}`)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 font-bold" style={{ background: 'var(--color-neutral-100)', color: 'var(--color-neutral-600)' }}>
                    {patient.avatar || <User size={20} />}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{patient.name}</div>
                    <div className="text-sm text-muted">ID: {patient.id} • {patient.age} yrs • {patient.gender}</div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm btn-icon text-primary-600" style={{ color: 'var(--color-primary-600)' }} title={t('view_file')}>
                    <FileText size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {!query && (
        <div className="card bg-neutral-0 border-primary-200 p-8 text-center" style={{ background: 'var(--color-neutral-0)', borderColor: 'var(--color-primary-200)' }}>
          <Search size={48} className="mx-auto mb-4 text-primary-300" style={{ color: 'var(--color-primary-300)' }} />
          <h3 className="heading-4 text-primary-800 mb-2" style={{ color: 'var(--color-primary-800)' }}>{t('search')}</h3>
          <p className="text-primary-600 max-w-md mx-auto" style={{ color: 'var(--color-primary-600)' }}>{t('search_placeholder')}</p>
        </div>
      )}
    </div>
  );
};

export default DoctorSearch;
