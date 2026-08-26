import React, { useState, useEffect, useRef } from 'react';
import { loginDoctor, getSummaryDetail, patchSummaryDetail } from '../api';
import { 
  UserCheck, Lock, Search, Save, FileText, CheckCircle2, 
  ExternalLink, Eye, AlertCircle, RefreshCw 
} from 'lucide-react';

export default function DoctorCommandCenter({ activeSessionId }) {
  // Auth State
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('doctor');
  const [password, setPassword] = useState('password123');
  const [authError, setAuthError] = useState('');

  // Session & Summary State
  const [selectedSessionId, setSelectedSessionId] = useState(activeSessionId || 1);
  const [summaryData, setSummaryData] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Editable Structured JSON State
  const [structuredSummary, setStructuredSummary] = useState({
    chief_complaint: { text: '', source_turns: [] },
    hpi: { text: '', source_turns: [] },
    pmh: { text: '', source_turns: [] },
    drug_allergy: { text: '', source_turns: [] },
    family_history: { text: '', source_turns: [] },
    personal_history: { text: '', source_turns: [] },
    ros: { text: '', source_turns: [] },
  });

  // Source-Linking Highlight State
  const [activeSourceTurns, setActiveSourceTurns] = useState([]);
  const [activeSourceDocs, setActiveSourceDocs] = useState([]);
  const [activeSectionKey, setActiveSectionKey] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const transcriptRefs = useRef({});

  // Auto update selectedSessionId if activeSessionId prop changes
  useEffect(() => {
    if (activeSessionId) {
      setSelectedSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  // Load summary detail when token and selectedSessionId are available
  const fetchSummary = async (sid = selectedSessionId) => {
    if (!token || !sid) return;
    setIsLoading(true);
    setSaveSuccess(false);
    try {
      const data = await getSummaryDetail(sid, token);
      const summaryObj = data.summary?.structured_json || {};
      setStructuredSummary(summaryObj);
      setDoctorNotes(data.summary?.doctor_notes || '');
      setTranscripts(data.transcripts || []);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to fetch summary detail:', err);
      alert(`Could not load Session #${sid}. Ensure session exists and summary is generated.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && selectedSessionId) {
      fetchSummary(selectedSessionId);
    }
  }, [token, selectedSessionId]);

  // Handle Login Form Submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    try {
      const res = await loginDoctor(username, password);
      setToken(res.token);
    } catch (err) {
      setAuthError(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Source Linking Highlight & Scroll
  const handleSelectField = (key, fieldObj) => {
    setActiveSectionKey(key);
    const turns = fieldObj.source_turns || [];
    const docs = fieldObj.source_documents || [];
    setActiveSourceTurns(turns);
    setActiveSourceDocs(docs);

    // Scroll to the first matching transcript turn in left pane
    if (turns.length > 0) {
      const firstTurnId = turns[0];
      const el = transcriptRefs.current[firstTurnId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle Text Edit for a Summary Field
  const handleTextChange = (key, textValue) => {
    setStructuredSummary(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        text: textValue
      }
    }));
  };

  // Handle Save / PATCH Summary
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

  // 1. LOGIN SCREEN
  if (!token) {
    return (
      <div className="kiosk-card" style={{ maxWidth: '450px', margin: '3rem auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="brand-logo" style={{ margin: '0 auto 1rem auto', width: '56px', height: '56px' }}>
            <UserCheck size={30} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem' }}>Doctor Command Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Clinician Review & Source-Linked Traceability
          </p>
        </div>

        {authError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.88rem' }}>
            {authError}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Doctor Username</label>
            <input 
              type="text" 
              className="form-input" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Sign In as Doctor'}
          </button>
        </form>
      </div>
    );
  }

  // 2. MAIN DOCTOR COMMAND CENTER DASHBOARD
  const summaryFields = [
    { key: 'chief_complaint', label: 'Chief Complaint' },
    { key: 'hpi', label: 'History of Present Illness (HPI)' },
    { key: 'pmh', label: 'Past Medical History (PMH)' },
    { key: 'drug_allergy', label: 'Drug / Allergy History' },
    { key: 'family_history', label: 'Family History' },
    { key: 'personal_history', label: 'Personal / Lifestyle History' },
    { key: 'ros', label: 'Review of Systems (ROS)' },
  ];

  return (
    <div>
      {/* Header bar for Session Selector & Actions */}
      <div style={{ background: 'var(--panel-bg)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--panel-border)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 700, color: 'white' }}>Session ID:</span>
          <input 
            type="number" 
            className="form-input" 
            style={{ width: '100px', padding: '0.4rem 0.75rem' }} 
            value={selectedSessionId} 
            onChange={e => setSelectedSessionId(Number(e.target.value))} 
          />
          <button 
            type="button" 
            className="btn-primary" 
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', width: 'auto' }} 
            onClick={() => fetchSummary(selectedSessionId)}
          >
            <RefreshCw size={14} /> Fetch Session
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveSuccess && (
            <span style={{ color: 'var(--success-text)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} /> Saved & Verified
            </span>
          )}
          <button 
            type="button" 
            className="btn-primary" 
            style={{ padding: '0.5rem 1.25rem', width: 'auto', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }} 
            onClick={handleSaveSummary}
            disabled={isLoading}
          >
            <Save size={16} /> {isLoading ? 'Saving...' : 'Save & Confirm Summary'}
          </button>
        </div>
      </div>

      {/* Two Pane Split View */}
      <div className="doctor-layout">
        {/* LEFT PANE: Transcript turns & Document Evidence */}
        <div className="doc-pane">
          <div className="pane-title">
            <span>Patient Evidence & Transcript</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Hover summary fields to trace source turns
            </span>
          </div>

          <div className="scroll-content">
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem', fontWeight: 700 }}>
              Full Intake Transcript ({transcripts.length} turns)
            </h4>

            {transcripts.map((t) => {
              const isHighlighted = activeSourceTurns.includes(t.turn);
              return (
                <div 
                  key={t.id || t.turn} 
                  ref={el => transcriptRefs.current[t.turn] = el}
                  className={`transcript-item ${isHighlighted ? 'highlighted' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ color: t.speaker === 'patient' ? '#818cf8' : '#38bdf8', fontSize: '0.82rem' }}>
                      {t.speaker === 'patient' ? 'Patient' : 'AI Assistant'}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Turn #{t.turn}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'white' }}>{t.text}</div>
                </div>
              );
            })}

            {/* Document OCR Evidence Section */}
            {documents.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem', fontWeight: 700 }}>
                  Uploaded Documents ({documents.length})
                </h4>
                {documents.map((doc) => {
                  const isDocHighlighted = activeSourceDocs.includes(doc.id);
                  return (
                    <div 
                      key={doc.id}
                      className={`transcript-item ${isDocHighlighted ? 'highlighted' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong style={{ color: 'white', fontSize: '0.85rem' }}>Doc #{doc.id} (Prescription OCR)</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success-text)' }}>Confidence: {(doc.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {doc.extracted_fields?.diagnosis && <div>Diagnosis: {doc.extracted_fields.diagnosis}</div>}
                        {doc.extracted_fields?.medicines?.length > 0 && <div>Rx: {doc.extracted_fields.medicines.join(', ')}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Source-Linked Structured Summary (Editable) */}
        <div className="doc-pane">
          <div className="pane-title">
            <span>Structured Clinical Summary</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
              Click to highlight source evidence
            </span>
          </div>

          <div className="scroll-content">
            {summaryFields.map(({ key, label }) => {
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
                        Traced to Turn(s): {fieldObj.source_turns.join(', ')}
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

            {/* Doctor Notes Box */}
            <div className="doctor-notes-box">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Doctor Review Notes</label>
              <textarea 
                className="field-textarea" 
                style={{ minHeight: '70px' }} 
                placeholder="Add clinician notes or verification sign-off here..." 
                value={doctorNotes} 
                onChange={e => setDoctorNotes(e.target.value)} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
