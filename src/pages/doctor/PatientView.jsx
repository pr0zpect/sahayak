import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Stethoscope, FileText, CheckCircle, Activity, HeartPulse } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import PatientIdCard from '../../components/PatientIdCard';
import { MOCK_INTAKE_SUMMARY, MOCK_VISIT_HISTORY } from '../../data/mockData';

const PatientView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('summary'); // summary, history, prescription
  const [showReferModal, setShowReferModal] = useState(false);
  const [referralNote, setReferralNote] = useState('');

  const patient = state.patients.find(p => p.id === id);
  if (!patient) return <div>Patient not found</div>;

  // Get the most recent queue entry for this patient
  const queueEntry = state.queue.find(q => q.patientId === patient.id) || {};
  
  // Use live data if available, fallback to mock for demo purposes
  const summary = queueEntry.intakeData || MOCK_INTAKE_SUMMARY;
  const history = MOCK_VISIT_HISTORY.filter(h => h.patientId === patient.id);

  const handleCompleteConsult = () => {
    // Find queue entry and mark completed
    const queueEntry = state.queue.find(q => q.patientId === patient.id && q.status === 'in-consultation');
    if (queueEntry) {
      dispatch({ type: 'UPDATE_QUEUE_STATUS', payload: { id: queueEntry.id, status: 'completed' } });
    }
    navigate('/doctor');
  };

  const handleRefer = () => {
    dispatch({
      type: 'ADD_REFERRAL',
      payload: {
        patientId: patient.id,
        patientName: patient.name,
        fromDoctorId: state.currentUser.id,
        fromDoctorName: state.currentUser.name,
        fromDepartment: state.currentUser.department,
        toDepartment: 'Cardiology', // Hardcoded for demo
        note: referralNote || 'Please evaluate.',
        priority: 'High'
      }
    });
    setShowReferModal(false);
    alert('Referral sent successfully!');
  };

  const Section = ({ title, children, alert }) => (
    <div className={`card mb-6 ${alert ? 'border-danger-200' : ''}`} style={alert ? { borderColor: 'var(--color-danger-200)' } : {}}>
      <h3 className={`heading-4 mb-4 pb-2 border-b ${alert ? 'text-danger-700 border-danger-100' : ''}`} style={alert ? { borderBottom: '1px solid var(--color-danger-100)', color: 'var(--color-danger-700)' } : { borderBottom: '1px solid var(--color-neutral-200)' }}>
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );

  const DataRow = ({ label, value }) => {
    if (!value) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:gap-4 pb-1">
        <span className="text-sm text-neutral-500 font-medium sm:w-48 flex-shrink-0" style={{ color: 'var(--color-neutral-500)' }}>{label}</span>
        <span className="text-neutral-800 text-sm" style={{ color: 'var(--color-neutral-800)' }}>{Array.isArray(value) ? value.join(', ') : value}</span>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button className="btn btn-ghost" onClick={() => navigate('/doctor')}>
          <ArrowLeft size={20} /> Back to Queue
        </button>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowReferModal(true)}>
            Refer Patient
          </button>
          <button className="btn btn-success" onClick={handleCompleteConsult}>
            <CheckCircle size={20} /> Complete Consultation
          </button>
        </div>
      </div>

      <PatientIdCard patient={patient} compact={window.innerWidth < 768} />

      <div className="tabs mt-6 flex-shrink-0">
        <button className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
          <Stethoscope size={16} /> Intake Summary
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <Activity size={16} /> Past History
        </button>
        <button className={`tab ${activeTab === 'prescription' ? 'active' : ''}`} onClick={() => setActiveTab('prescription')}>
          <FileText size={16} /> Write Prescription
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-6 pb-24">
        {activeTab === 'summary' && (
          <div className="grid grid-2 gap-6">
            <div className="space-y-6">
              {summary.redFlags.length > 0 && (
                <Section title="AI Red Flags" alert>
                  <ul className="list-disc pl-5 text-danger-700 text-sm space-y-1 font-medium" style={{ color: 'var(--color-danger-700)' }}>
                    {summary.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
                  </ul>
                </Section>
              )}
              
              <Section title="Chief Complaint">
                <div className="text-lg font-bold p-4 rounded-xl" style={{ color: 'var(--color-primary-800)', background: 'var(--color-neutral-0)' }}>
                  {summary.chiefComplaint}
                </div>
              </Section>

              <Section title="HPI (SOCRATES)">
                <DataRow label="Site" value={summary.hpiSocrates.site} />
                <DataRow label="Onset" value={summary.hpiSocrates.onset} />
                <DataRow label="Character" value={summary.hpiSocrates.character} />
                <DataRow label="Radiation" value={summary.hpiSocrates.radiation} />
                <DataRow label="Associated Symptoms" value={summary.hpiSocrates.associations} />
                <DataRow label="Timing" value={summary.hpiSocrates.timing} />
                <DataRow label="Exacerbating/Relieving" value={summary.hpiSocrates.exacerbating} />
                <DataRow label="Severity" value={summary.hpiSocrates.severity} />
              </Section>
            </div>

            <div className="space-y-6">
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
              
              <Section title="AI Suggested Diagnosis">
                <div className="bg-neutral-50 p-4 rounded-xl text-sm" style={{ background: 'var(--color-neutral-50)' }}>
                  <div className="font-bold mb-2 flex items-center gap-2"><HeartPulse size={16} /> Differential</div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Acute Coronary Syndrome (High Probability)</li>
                    <li>GERD (Moderate Probability)</li>
                    <li>Costochondritis (Low Probability)</li>
                  </ol>
                </div>
              </Section>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {history.length === 0 ? (
              <div className="text-center p-12 text-muted">No past history found for this patient.</div>
            ) : (
              history.map(record => (
                <div key={record.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">{record.diagnosis}</h4>
                    <span className="text-sm font-bold bg-neutral-100 px-3 py-1 rounded-full text-neutral-600" style={{ background: 'var(--color-neutral-100)', color: 'var(--color-neutral-600)' }}>
                      {new Date(record.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-600 mb-4" style={{ color: 'var(--color-neutral-600)' }}>
                    {record.doctor} • {record.department}
                  </div>
                  <p className="text-sm text-neutral-800 mb-4" style={{ color: 'var(--color-neutral-800)' }}>{record.summary}</p>
                  
                  {record.prescriptions && (
                    <div className="bg-neutral-50 p-3 rounded-lg" style={{ background: 'var(--color-neutral-50)' }}>
                      <div className="text-xs font-bold text-neutral-500 uppercase mb-2" style={{ color: 'var(--color-neutral-500)' }}>Rx</div>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {record.prescriptions.map((med, idx) => <li key={idx}>{med}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'prescription' && (
          <div className="max-w-3xl mx-auto">
            <div className="card shadow-sm border" style={{ borderColor: 'var(--color-neutral-200)' }}>
              <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderBottom: '1px solid var(--color-neutral-200)' }}>
                <h3 className="heading-3">E-Prescription</h3>
                <div className="text-muted text-sm">{new Date().toLocaleDateString()}</div>
              </div>

              <div className="space-y-6">
                <div className="input-group">
                  <label className="input-label">Diagnosis</label>
                  <input type="text" className="input" placeholder="Enter primary diagnosis" />
                </div>
                
                <div className="input-group">
                  <label className="input-label">Medications (Rx)</label>
                  <textarea className="input" rows={4} placeholder="Format: Drug Name - Dose - Frequency - Duration"></textarea>
                </div>

                <div className="input-group">
                  <label className="input-label">Lab Tests / Investigations</label>
                  <input type="text" className="input" placeholder="e.g. ECG, Troponin I" />
                </div>

                <div className="input-group">
                  <label className="input-label">Advice / Remarks</label>
                  <textarea className="input" rows={2} placeholder="General advice for patient"></textarea>
                </div>
                
                <div className="flex justify-end gap-4 pt-4">
                  <button className="btn btn-secondary">Save Draft</button>
                  <button className="btn btn-primary" onClick={handleCompleteConsult}>Issue Prescription</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showReferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="heading-3 mb-4">Refer Patient</h3>
            <p className="mb-4 text-sm text-neutral-600">Forwarding {patient.name}'s complete record to another department.</p>
            <div className="input-group">
              <label className="input-label">Department</label>
              <select className="input">
                <option>Cardiology</option>
                <option>Neurology</option>
                <option>Orthopedics</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Referral Note</label>
              <textarea 
                className="input" 
                rows={3} 
                value={referralNote} 
                onChange={(e) => setReferralNote(e.target.value)}
                placeholder="Reason for referral..."
              />
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button className="btn btn-ghost" onClick={() => setShowReferModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRefer}>Send Referral</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientView;
