import React, { useState, useEffect, useRef } from 'react';
import { loginDoctor, getSummaryDetail, patchSummaryDetail, pushAbdm } from '../api';
import { 
  UserCheck, Save, RefreshCw, CheckCircle2, ShieldAlert, Leaf, Activity, FileText, Send 
} from 'lucide-react';

export default function DoctorCommandCenter({ activeSessionId }) {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('doctor');
  const [password, setPassword] = useState('password123');
  const [authError, setAuthError] = useState('');

  const [selectedSessionId, setSelectedSessionId] = useState(activeSessionId || null);
  const [fetchError, setFetchError] = useState('');
  const [mode, setMode] = useState('allopathic');
  const [summaryData, setSummaryData] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [clinicalFlags, setClinicalFlags] = useState([]);
  const [consentRecords, setConsentRecords] = useState([]);
  const [abdmLogs, setAbdmLogs] = useState([]);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [structuredSummary, setStructuredSummary] = useState({
    chief_complaint: { text: '', source_turns: [] },
    hpi: { text: '', source_turns: [] },
    pmh: { text: '', source_turns: [] },
    drug_allergy: { text: '', source_turns: [] },
    family_history: { text: '', source_turns: [] },
    personal_history: { text: '', source_turns: [] },
    ros: { text: '', source_turns: [] },
  });

  const [activeSourceTurns, setActiveSourceTurns] = useState([]);
  const [activeSourceDocs, setActiveSourceDocs] = useState([]);
  const [activeSectionKey, setActiveSectionKey] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const transcriptRefs = useRef({});

  useEffect(() => {
    if (activeSessionId) setSelectedSessionId(activeSessionId);
  }, [activeSessionId]);

  const fetchSummary = async (sid = selectedSessionId) => {
    if (!token || !sid) return;
    setIsLoading(true);
    setSaveSuccess(false);
    setFetchError('');
    try {
      const data = await getSummaryDetail(sid, token);
      setMode(data.mode || 'allopathic');
      const summaryObj = data.summary?.structured_json || {};
      setStructuredSummary(summaryObj);
      setDoctorNotes(data.summary?.doctor_notes || '');
      setTranscripts(data.transcripts || []);
      setDocuments(data.documents || []);
      setClinicalFlags(data.clinical_flags || []);
      setConsentRecords(data.consent_records || []);
      setAbdmLogs(data.abdm_logs || []);
    } catch (err) {
      setFetchError(`Could not load Session #${sid}. Ensure session exists and has a summary generated.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && selectedSessionId) fetchSummary(selectedSessionId);
  }, [token, selectedSessionId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    try {
      const res = await loginDoctor(username, password);
      setToken(res.token);
    } catch (err) {
      setAuthError(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectField = (key, fieldObj) => {
    setActiveSectionKey(key);
    const turns = fieldObj.source_turns || [];
    const docs = fieldObj.source_documents || [];
    setActiveSourceTurns(turns);
    setActiveSourceDocs(docs);

    if (turns.length > 0) {
      const firstTurnId = turns[0];
      const el = transcriptRefs.current[firstTurnId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleTextChange = (key, textValue) => {
    setStructuredSummary(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        text: textValue
      }
    }));
  };

  const handleSaveSummary = async () => {
    if (!token || !selectedSessionId) return;
    setIsLoading(true);
    try {
      await patchSummaryDetail(selectedSessionId, token, structuredSummary, doctorNotes);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert('Failed to save summary updates.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryAbdmPush = async () => {
    setIsLoading(true);
    try {
      await pushAbdm(selectedSessionId);
      await fetchSummary(selectedSessionId);
      alert('ABDM Push re-executed successfully!');
    } catch (err) {
      alert('Failed to push to ABDM.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="kiosk-card" style={{ maxWidth: '450px', margin: '3rem auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="brand-logo" style={{ margin: '0 auto 1rem auto', width: '56px', height: '56px' }}>
            <UserCheck size={30} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>Doctor Command Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Clinician Verification & Source-Linked Traceability
          </p>
        </div>

        {authError && (
          <div style={{ background: 'var(--danger-bg)', border: '1.5px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.88rem', fontWeight: 600 }}>
            {authError}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input type="text" className="form-input" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In as Doctor'}
          </button>
        </form>
      </div>
    );
  }

  const allopathicFields = [
    { key: 'chief_complaint', label: 'Chief Complaint' },
    { key: 'hpi', label: 'History of Present Illness (HPI)' },
    { key: 'pmh', label: 'Past Medical History (PMH)' },
    { key: 'drug_allergy', label: 'Drug / Allergy History' },
    { key: 'family_history', label: 'Family History' },
    { key: 'personal_history', label: 'Personal / Lifestyle History' },
    { key: 'ros', label: 'Review of Systems (ROS)' },
  ];

  const ayushFields = [
    { key: 'prakriti_assessment', label: 'Prakriti Assessment (Constitutional Dosha)' },
    { key: 'agni_koshtha', label: 'Agni & Koshtha (Digestive Fire & Bowel)' },
    { key: 'ahara_vihara_habits', label: 'Ahara & Vihara (Dietary & Lifestyle)' },
    { key: 'vikriti_patterns', label: 'Vikriti Imbalance & Dhatu Pattern' },
  ];

  const summaryFieldsToRender = mode === 'ayush' ? [...allopathicFields, ...ayushFields] : allopathicFields;

  return (
    <div>
      {/* Top Header Controls */}
      <div style={{ background: '#ffffff', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--panel-border)', marginBottom: fetchError ? '0' : '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>Session ID:</span>
          <input 
            type="number" 
            className="form-input" 
            style={{ width: '90px', padding: '0.45rem 0.75rem', background: '#f8fafc' }} 
            value={selectedSessionId || ''} 
            placeholder="e.g. 18"
            onChange={e => setSelectedSessionId(e.target.value ? Number(e.target.value) : null)} 
          />
          <button type="button" className="btn-primary" style={{ padding: '0.5rem 1rem', width: 'auto', fontSize: '0.88rem' }} onClick={() => fetchSummary(selectedSessionId)}>
            <RefreshCw size={15} /> Fetch
          </button>
          <span style={{ fontSize: '0.82rem', background: mode === 'ayush' ? '#ecfdf5' : '#eff6ff', color: mode === 'ayush' ? '#065f46' : '#1e40af', padding: '5px 12px', borderRadius: '16px', fontWeight: 800, border: mode === 'ayush' ? '1px solid #a7f3d0' : '1px solid #bfdbfe' }}>
            {mode === 'ayush' ? 'AYUSH MODE' : 'ALLOPATHIC MODE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveSuccess && (
            <span style={{ color: 'var(--success-text)', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={18} /> Saved & Verified
            </span>
          )}
          <button type="button" className="btn-primary" style={{ padding: '0.6rem 1.4rem', width: 'auto', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }} onClick={handleSaveSummary} disabled={isLoading}>
            <Save size={18} /> Save Summary
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem 1.25rem', borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: 600 }}>
          {fetchError}
        </div>
      )}


      {/* Clinical Safety Alert Panel if flags exist */}
      {clinicalFlags.length > 0 && (
        <div style={{ background: 'var(--warning-bg)', border: '1.5px solid var(--warning-border)', padding: '1.1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <div style={{ color: 'var(--warning-text)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
            <ShieldAlert size={20} /> Clinical Safety Alerts Surfaced ({clinicalFlags.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {clinicalFlags.map((flag, idx) => (
              <div key={idx} style={{ fontSize: '0.88rem', color: '#0f172a', background: '#ffffff', padding: '0.7rem 0.9rem', borderRadius: '12px', border: '1px solid #fde68a' }}>
                {flag.flag_type === 'abnormal_value' ? (
                  <div>⚠️ <strong>{flag.detail.test_name}:</strong> {flag.detail.value} (Ref: {flag.detail.reference_range}) — Status: <strong style={{ color: '#dc2626' }}>{flag.detail.status}</strong></div>
                ) : (
                  <div>🚫 <strong>Drug Interaction:</strong> {flag.detail.interacting_pair?.join(' + ')} — {flag.detail.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Pane Split View */}
      <div className="doctor-layout">
        {/* LEFT PANE: Transcript Turns & OCR Evidence */}
        <div className="doc-pane">
          <div className="pane-title">
            <span>Intake Transcript & OCR Evidence</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>Click summary cards to highlight turns</span>
          </div>

          <div className="scroll-content">
            {transcripts.map((t) => {
              const isHighlighted = activeSourceTurns.includes(t.turn);
              return (
                <div 
                  key={t.id || t.turn} 
                  ref={el => transcriptRefs.current[t.turn] = el}
                  className={`transcript-item ${isHighlighted ? 'highlighted' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <strong style={{ color: t.speaker === 'patient' ? '#2563eb' : '#0284c7', fontSize: '0.85rem' }}>
                      {t.speaker === 'patient' ? 'Patient' : 'AI Assistant'}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Turn #{t.turn}</span>
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 500 }}>{t.text}</div>
                </div>
              );
            })}

            {documents.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.6rem', fontWeight: 800 }}>
                  Uploaded Documents ({documents.length})
                </h4>
                {documents.map((doc) => {
                  const isDocHighlighted = activeSourceDocs.includes(doc.id);
                  return (
                    <div key={doc.id} className={`transcript-item ${isDocHighlighted ? 'highlighted' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>Doc #{doc.id} ({doc.ocr_method})</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--success-text)', fontWeight: 700 }}>Conf: {(doc.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        {doc.extracted_text.slice(0, 110)}...
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Source-Linked Summary (Editable) */}
        <div className="doc-pane">
          <div className="pane-title">
            <span>Structured Summary ({mode.toUpperCase()})</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>Click cards to trace sources</span>
          </div>

          <div className="scroll-content">
            {summaryFieldsToRender.map(({ key, label }) => {
              const fieldObj = structuredSummary[key] || { text: '', source_turns: [] };
              const isActive = activeSectionKey === key;
              const sourceTurnsCount = fieldObj.source_turns?.length || 0;

              return (
                <div 
                  key={key} 
                  className={`summary-card-field ${isActive ? 'active-source' : ''}`}
                  onClick={() => handleSelectField(key, fieldObj)}
                >
                  <div className="field-label">
                    <span>{label}</span>
                    {sourceTurnsCount > 0 && (
                      <span className="source-tag">
                        Source Turn(s): {fieldObj.source_turns.join(', ')}
                      </span>
                    )}
                  </div>
                  <textarea 
                    className="field-textarea" 
                    value={fieldObj.text || ''} 
                    onChange={e => handleTextChange(key, e.target.value)} 
                    placeholder="Not reported."
                  />
                </div>
              );
            })}

            <div className="doctor-notes-box">
              <label className="form-label" style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Clinician Verification & Notes</label>
              <textarea 
                className="field-textarea" 
                style={{ minHeight: '65px' }} 
                placeholder="Enter clinician sign-off notes here..." 
                value={doctorNotes} 
                onChange={e => setDoctorNotes(e.target.value)} 
              />
            </div>

            {/* ABDM Push Log & Retry Button */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1.5px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>ABDM FHIR Export Status</span>
                <button type="button" className="btn-primary" style={{ padding: '0.4rem 0.9rem', width: 'auto', fontSize: '0.82rem' }} onClick={handleRetryAbdmPush}>
                  Retry ABDM Push
                </button>
              </div>
              {abdmLogs.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Latest Status: <strong style={{ color: '#059669' }}>{abdmLogs[0].status.toUpperCase()}</strong> ({abdmLogs[0].attempted_at})
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
