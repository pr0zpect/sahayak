import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const PatientIdCard = ({ patient, compact = false }) => {
  if (!patient) return null;

  return (
    <div className="patient-id-card flex-wrap md:flex-nowrap">
      <div className="patient-avatar">
        {patient.avatar || patient.name.charAt(0)}
      </div>
      
      <div className="flex-1 min-w-[200px]">
        <div className="text-2xl font-bold mb-1">{patient.name}</div>
        <div className="flex flex-wrap gap-4 text-sm text-neutral-600 mb-3" style={{ color: 'var(--color-neutral-600)' }}>
          <span>{patient.age} yrs • {patient.gender}</span>
          <span>Blood: {patient.bloodGroup}</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="badge badge-primary">
            ID: {patient.id}
          </div>
          <div className="badge badge-neutral">
            ABHA: {patient.abhaId}
          </div>
        </div>
      </div>
      
      {!compact && (
        <div className="hidden sm:flex flex-col items-center justify-center p-2 bg-white rounded-lg shadow-sm">
          <QRCodeSVG value={`sahayak:patient:${patient.id}`} size={80} level="M" />
          <span className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider font-semibold">Scan to View</span>
        </div>
      )}
    </div>
  );
};

export default PatientIdCard;
