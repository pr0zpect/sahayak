import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Edit2, CheckCircle, ArrowRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';
import { MOCK_INTAKE_SUMMARY } from '../../data/mockData';

const IntakeSummary = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const t = useTranslation(state.language);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [summary] = useState(() => {
    // Use tempIntake if available, otherwise fallback to mock or empty
    const data = state.tempIntake || {};
    return {
      chiefComplaint: data.chiefComplaint?.main || MOCK_INTAKE_SUMMARY.chiefComplaint,
      hpiSocrates: {
        site: data.hpiSocrates?.site || MOCK_INTAKE_SUMMARY.hpiSocrates.site,
        onset: data.hpiSocrates?.onset || MOCK_INTAKE_SUMMARY.hpiSocrates.onset,
        character: data.hpiSocrates?.character || MOCK_INTAKE_SUMMARY.hpiSocrates.character,
        radiation: data.hpiSocrates?.radiation || MOCK_INTAKE_SUMMARY.hpiSocrates.radiation,
        associations: data.hpiSocrates?.associations || MOCK_INTAKE_SUMMARY.hpiSocrates.associations,
        timing: data.hpiSocrates?.timing || MOCK_INTAKE_SUMMARY.hpiSocrates.timing,
        exacerbating: data.hpiSocrates?.exacerbating || MOCK_INTAKE_SUMMARY.hpiSocrates.exacerbating,
        severity: data.hpiSocrates?.severity || MOCK_INTAKE_SUMMARY.hpiSocrates.severity,
      },
      pastHistory: {
        medical: data.pastHistory?.medical || MOCK_INTAKE_SUMMARY.pastHistory.medical,
        surgical: data.pastHistory?.surgical || MOCK_INTAKE_SUMMARY.pastHistory.surgical,
        hospitalizations: data.pastHistory?.hospitalizations || MOCK_INTAKE_SUMMARY.pastHistory.hospitalizations,
      },
      drugHistory: {
        current: data.drugHistory?.current || MOCK_INTAKE_SUMMARY.drugHistory.current,
        compliance: data.drugHistory?.compliance || MOCK_INTAKE_SUMMARY.drugHistory.compliance,
      },
      allergyHistory: {
        drugAllergies: data.allergyHistory?.drugAllergies || MOCK_INTAKE_SUMMARY.allergyHistory.drugAllergies,
        foodAllergies: data.allergyHistory?.foodAllergies || MOCK_INTAKE_SUMMARY.allergyHistory.foodAllergies,
      },
      redFlags: state.alerts.filter(a => a.type === 'red-flag' && a.patientId === state.currentUser?.id).map(a => a.message),
    };
  });

  const toggleAudio = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setTimeout(() => setIsPlaying(false), 4000); // Mock audio duration
    }
  };

  const handleSubmit = () => {
    // Add patient to queue
    const queueEntry = {
      patientId: state.currentUser.id,
      patientName: state.currentUser.name,
      tokenNumber: `T-${Math.floor(100 + Math.random() * 900)}`,
      doctorId: 'DOC-001',
      doctorName: 'Dr. Rajesh Kumar Sharma',
      department: 'General Medicine',
      chiefComplaint: summary.chiefComplaint,
      status: 'waiting',
      waitTime: 0,
      redFlag: summary.redFlags.length > 0,
      avatar: state.currentUser?.avatar,
      intakeData: summary, // Pass full live summary
    };
    
    dispatch({ type: 'ADD_TO_QUEUE', payload: queueEntry });
    navigate('/patient'); // Go to patient dashboard
  };

  const Section = ({ title, children }) => (
    <div className="card mb-6">
      <div className="flex justify-between items-center mb-4 border-b pb-2" style={{ borderBottom: '1px solid var(--color-neutral-200)' }}>
        <h3 className="heading-4 text-primary-700" style={{ color: 'var(--color-primary-700)' }}>{title}</h3>
        <button className="btn btn-ghost btn-sm btn-icon text-muted" title="Edit this section">
          <Edit2 size={16} />
        </button>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );

  const DataRow = ({ label, value }) => {
    if (!value) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:gap-4 border-b border-dashed pb-2 last:border-0" style={{ borderColor: 'var(--color-neutral-200)' }}>
        <span className="text-sm text-neutral-500 font-medium sm:w-48 flex-shrink-0" style={{ color: 'var(--color-neutral-500)' }}>{label}</span>
        <span className="text-neutral-800" style={{ color: 'var(--color-neutral-800)' }}>{Array.isArray(value) ? value.join(', ') : value}</span>
      </div>
    );
  };

  return (
    <div className="page" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--color-neutral-50)' }}>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="heading-2">Review & Submit</h1>
          <p className="text-muted mt-1">Please review your clinical history before it is sent to the doctor.</p>
        </div>
        
        <button 
          className={`btn btn-icon rounded-full ${isPlaying ? 'bg-primary-100 text-primary-600 shadow-glow-primary' : 'bg-white shadow-sm'}`}
          onClick={toggleAudio}
          style={isPlaying ? { background: 'var(--color-primary-100)', color: 'var(--color-primary-600)', boxShadow: 'var(--shadow-glow-primary)' } : { background: 'white' }}
        >
          <Volume2 size={24} className={isPlaying ? 'animate-pulse' : ''} />
        </button>
      </div>

      <div className="mb-8">
        <Section title="Chief Complaint">
          <DataRow label="Main Problem" value={summary.chiefComplaint} />
        </Section>

        <Section title="History of Present Illness (SOCRATES)">
          <DataRow label="Site" value={summary.hpiSocrates.site} />
          <DataRow label="Onset" value={summary.hpiSocrates.onset} />
          <DataRow label="Character" value={summary.hpiSocrates.character} />
          <DataRow label="Radiation" value={summary.hpiSocrates.radiation} />
          <DataRow label="Associated Symptoms" value={summary.hpiSocrates.associations} />
          <DataRow label="Timing" value={summary.hpiSocrates.timing} />
          <DataRow label="Exacerbating/Relieving" value={summary.hpiSocrates.exacerbating} />
          <DataRow label="Severity" value={summary.hpiSocrates.severity} />
        </Section>

        <Section title="Past Medical & Surgical History">
          <DataRow label="Medical Conditions" value={summary.pastHistory.medical} />
          <DataRow label="Surgeries" value={summary.pastHistory.surgical} />
          <DataRow label="Past Hospitalizations" value={summary.pastHistory.hospitalizations} />
        </Section>

        <Section title="Drugs & Allergies">
          <DataRow label="Current Medications" value={summary.drugHistory.current} />
          <DataRow label="Compliance" value={summary.drugHistory.compliance} />
          <DataRow label="Drug Allergies" value={summary.allergyHistory.drugAllergies} />
          <DataRow label="Food/Other Allergies" value={summary.allergyHistory.foodAllergies} />
        </Section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 flex justify-center" style={{ borderTop: '1px solid var(--color-neutral-200)' }}>
        <div className="w-full max-w-[800px] flex gap-4">
          <button className="btn btn-secondary flex-1" onClick={() => navigate(-1)}>
            Go Back & Edit
          </button>
          <button className="btn btn-primary flex-1 btn-lg" onClick={handleSubmit}>
            <CheckCircle size={20} /> Submit to Doctor
          </button>
        </div>
      </div>
      <div className="h-24"></div> {/* Padding for fixed footer */}
    </div>
  );
};

export default IntakeSummary;
