import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';
import PatientIdCard from '../../components/PatientIdCard';

const PatientProfile = () => {
  const { state } = useAppContext();
  const t = useTranslation(state.language);
  const patient = state.currentUser;

  if (!patient) return null;

  const DataRow = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-dashed last:border-0" style={{ borderColor: 'var(--color-neutral-200)' }}>
      <span className="text-sm font-medium text-neutral-500" style={{ color: 'var(--color-neutral-500)' }}>{label}</span>
      <span className="text-sm font-medium text-neutral-900 sm:text-right" style={{ color: 'var(--color-neutral-900)' }}>{value}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">{t('profile')}</h1>
      </div>

      <PatientIdCard patient={patient} />

      <div className="mt-8 grid grid-2 gap-8">
        <div className="card">
          <h2 className="heading-4 mb-4 pb-2 border-b" style={{ borderBottom: '1px solid var(--color-neutral-200)' }}>{t('personal_info')}</h2>
          <DataRow label={t('reg_full_name')} value={patient.name} />
          <DataRow label={`${t('reg_age')} / ${t('reg_gender')}`} value={`${patient.age} yrs / ${patient.gender}`} />
          <DataRow label={t('blood_group')} value={patient.bloodGroup} />
          <DataRow label={t('reg_mobile')} value={patient.phone} />
          <DataRow label={t('address')} value={patient.address} />
        </div>

        <div className="card">
          <h2 className="heading-4 mb-4 pb-2 border-b" style={{ borderBottom: '1px solid var(--color-neutral-200)' }}>{t('identity_records')}</h2>
          <DataRow label="Sahayak ID" value={patient.id} />
          <DataRow label="ABHA ID" value={patient.abhaId} />
          <DataRow label={t('aadhaar_no')} value={`XXXX-XXXX-${patient.aadhaar.split('-').pop()}`} />
          <DataRow label={t('date')} value={new Date(patient.registeredDate).toLocaleDateString()} />
          <DataRow label={t('pref_language')} value={patient.language.toUpperCase()} />
        </div>
      </div>
      
      <div className="card mt-8">
        <h2 className="heading-4 mb-4 pb-2 border-b text-danger-700" style={{ borderBottom: '1px solid var(--color-danger-200)', color: 'var(--color-danger-700)' }}>{t('emerg_contact')}</h2>
        <DataRow label={t('emerg_person')} value={patient.emergencyContact} />
      </div>
    </div>
  );
};

export default PatientProfile;
