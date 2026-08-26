import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';
import { ArrowRight, User } from 'lucide-react';

const DoctorReferrals = () => {
  const { state } = useAppContext();
  const t = useTranslation(state.language);
  const doctor = state.currentUser;
  
  // Find referrals for this doctor or department
  const referrals = state.referrals.filter(r => r.toDoctorId === doctor?.id || r.toDepartment === doctor?.department);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">{t('active_referrals')}</h1>
        <p className="page-subtitle">{t('referrals_desc')}</p>
      </div>

      <div className="grid gap-4">
        {referrals.length === 0 ? (
          <div className="card p-12 text-center text-muted">
            <div className="text-4xl mb-4">{t('no_results')}</div>
          </div>
        ) : (
          referrals.map(ref => (
            <div key={ref.id} className="card p-4 flex flex-col md:flex-row items-center gap-6">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
                <User size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{ref.patientName}</h3>
                  <span className="badge badge-neutral">{ref.date}</span>
                  <span className="badge badge-warning">Priority: {ref.priority || 'Normal'}</span>
                </div>
                <div className="text-sm font-medium text-neutral-600 mb-1" style={{ color: 'var(--color-neutral-600)' }}>
                  {t('referred_by')}: {ref.fromDoctorName} ({ref.fromDepartment})
                </div>
                <div className="text-sm text-neutral-800 bg-neutral-50 p-2 rounded mt-2" style={{ background: 'var(--color-neutral-50)', color: 'var(--color-neutral-800)' }}>
                  <strong>{t('reason')}:</strong> {ref.note}
                </div>
              </div>
              <div>
                <button className="btn btn-primary">{t('confirm')}</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorReferrals;
