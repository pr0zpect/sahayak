import React, { useState, useEffect, useRef } from 'react';
import { startInterview, respondInterview, uploadDocument, generateSummary, pushAbdm, grantConsent } from '../api';
import { 
  Mic, MicOff, Send, AlertTriangle, UploadCloud, CheckCircle2, 
  Volume2, VolumeX, ShieldCheck, ArrowRight, Activity, Leaf, ShieldAlert, Sparkles, User, Stethoscope 
} from 'lucide-react';

export default function PatientKiosk({ activeSessionId, setActiveSessionId, onSessionComplete }) {
  // Step state: 1: Consent/Mode, 2: Interview, 3: Document OCR & Clinical Flags, 4: Summary & ABDM Push
  const [step, setStep] = useState(1);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [language, setLanguage] = useState('en');
  const [mode, setMode] = useState('allopathic'); // 'allopathic' or 'ayush'
  const [abhaId, setAbhaId] = useState('');
  const [abhaNumber, setAbhaNumber] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentScope, setConsentScope] = useState({
    intake_interview: true,
    ocr_scanning: true,
    abdm_sharing: true,
  });

  // Chat State
  const [chatHistory, setChatHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [chips, setChips] = useState([]);
  const [inputAnswer, setInputAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Red Flag State
  const [redFlag, setRedFlag] = useState(false);
  const [redFlagReason, setRedFlagReason] = useState('');

  // Speech State
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef(null);

  // OCR & Clinical Safety Flags State
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [clinicalFlags, setClinicalFlags] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Summary & ABDM State
  const [summaryData, setSummaryData] = useState(null);
  const [abdmResult, setAbdmResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputAnswer(transcript);
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [language]);

  const speakText = (text) => {
    if (!ttsEnabled || !('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!patientName.trim() || !consentGiven) return;

    setIsLoading(true);
    try {
      const data = await startInterview(patientName.trim(), language, mode, abhaId.trim() || null, abhaNumber.trim() || null);
      setActiveSessionId(data.session_id);
      setCurrentQuestion(data.question);
      setChips(data.chips || []);
      setChatHistory([{ turn: 1, speaker: 'ai', text: data.question }]);
      
      await grantConsent(data.session_id, consentScope).catch(() => {});

      setStep(2);
      speakText(data.question);
    } catch (err) {
      alert('Failed to start interview. Ensure backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (answerText, inputModeChoice = 'touch') => {
    if (!answerText.trim() || isLoading) return;

    const userText = answerText.trim();
    setInputAnswer('');
    setIsLoading(true);

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const nextTurnNum = chatHistory.length + 1;
    const updatedHistory = [
      ...chatHistory,
      { turn: nextTurnNum, speaker: 'patient', text: userText, inputMode: inputModeChoice }
    ];
    setChatHistory(updatedHistory);

    try {
      const res = await respondInterview(activeSessionId, userText, inputModeChoice, language);

      if (res.red_flag) {
        setRedFlag(true);
        setRedFlagReason(res.red_flag_reason || 'Emergency symptom detected.');
      }

      if (res.done) {
        setStep(3);
      } else {
        const aiQuestion = res.question;
        const aiTurnNum = updatedHistory.length + 1;
        setCurrentQuestion(aiQuestion);
        setChips(res.chips || []);
        setChatHistory([
          ...updatedHistory,
          { turn: aiTurnNum, speaker: 'ai', text: aiQuestion }
        ]);
        speakText(aiQuestion);
      }
    } catch (err) {
      alert('Failed to send answer to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Web Speech API is not supported in this browser. Please use Chrome or type your answer.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputAnswer('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const docRes = await uploadDocument(activeSessionId, file);
      setUploadedDocs(prev => [...prev, docRes]);
      if (docRes.clinical_flags) {
        setClinicalFlags(prev => [...prev, ...docRes.clinical_flags]);
      }
    } catch (err) {
      alert('Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProceedToSummary = async () => {
    setIsLoading(true);
    try {
      const summary = await generateSummary(activeSessionId);
      setSummaryData(summary);
      setStep(4);
    } catch (err) {
      alert('Failed to generate summary.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToAbdm = async () => {
    setIsLoading(true);
    try {
      const res = await pushAbdm(activeSessionId);
      setAbdmResult(res);
      setToastMessage(`Pushed to ABHA ✓ (${res.abha_id})`);
    } catch (err) {
      alert('Failed to push to ABDM.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = () => {
    if (onSessionComplete) onSessionComplete();
    setActiveSessionId(null);
    setStep(1);
    setPatientName('');
    setAbhaId('');
    setAbhaNumber('');
    setConsentGiven(false);
    setChatHistory([]);
    setRedFlag(false);
    setRedFlagReason('');
    setUploadedDocs([]);
    setClinicalFlags([]);
    setSummaryData(null);
    setAbdmResult(null);
    setToastMessage(null);
  };

  return (
    <div className="kiosk-card">
      {toastMessage && (
        <div className="toast-badge">
          <CheckCircle2 size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {redFlag && (
        <div className="red-flag-banner">
          <div className="red-flag-icon">!</div>
          <div>
            <div className="red-flag-title">EMERGENCY ALERT: Immediate Triage Escalation</div>
            <div className="red-flag-desc">{redFlagReason || 'Emergency symptom detected. Staff notified.'}</div>
          </div>
        </div>
      )}

      <div className="step-indicator">
        <div className={`step-pill ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <span className="step-number">1</span> Mode & Consent
        </div>
        <div className={`step-pill ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <span className="step-number">2</span> {mode === 'ayush' ? 'AYUSH Intake' : 'Interview'}
        </div>
        <div className={`step-pill ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
          <span className="step-number">3</span> OCR & Safety
        </div>
        <div className={`step-pill ${step === 4 ? 'active' : ''}`}>
          <span className="step-number">4</span> Review & ABDM
        </div>
      </div>

      {/* STEP 1: Mode Selection & DPDP Act 2023 Consent */}
      {step === 1 && (
        <form onSubmit={handleStartSession} className="consent-form">
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', color: '#2563eb' }}>
              <Sparkles size={32} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              Welcome to MediKiosk
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', marginTop: '0.2rem' }}>
              Adaptive pre-consultation intake & digital health records integration
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="form-group">
            <label className="form-label">Select Intake Care Model</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div 
                className={`summary-card-field ${mode === 'allopathic' ? 'active-source' : ''}`}
                onClick={() => setMode('allopathic')}
                style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', borderRadius: '18px', background: mode === 'allopathic' ? '#eff6ff' : '#f8fafc', borderColor: mode === 'allopathic' ? '#2563eb' : '#e2e8f0' }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem auto' }}>
                  <Activity size={22} />
                </div>
                <strong style={{ color: '#0f172a', display: 'block', fontSize: '1rem', fontWeight: 700 }}>Allopathic OPD</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>SOCRATES History Taking</span>
              </div>
              <div 
                className={`summary-card-field ${mode === 'ayush' ? 'active-source' : ''}`}
                onClick={() => setMode('ayush')}
                style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', borderRadius: '18px', background: mode === 'ayush' ? '#ecfdf5' : '#f8fafc', borderColor: mode === 'ayush' ? '#10b981' : '#e2e8f0' }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem auto' }}>
                  <Leaf size={22} />
                </div>
                <strong style={{ color: '#0f172a', display: 'block', fontSize: '1rem', fontWeight: 700 }}>AYUSH OPD</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Dashavidha Pariksha & Agni</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Patient Full Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Rukmini Devi" 
              value={patientName} 
              onChange={e => setPatientName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Preferred Interview Language</label>
            <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="kn">Kannada (கன்னட)</option>
              <option value="bn">Bengali (বাংলা)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">ABHA ID / Number (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. 91-1234-5678-9012" 
              value={abhaNumber} 
              onChange={e => setAbhaNumber(e.target.value)} 
            />
          </div>

          <div className="consent-box">
            <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', fontWeight: 700 }}>
              <ShieldCheck size={18} color="#10b981" /> DPDP Act 2023 Consent Declaration
            </strong>
            I grant permission for MediKiosk to record my clinical history, digitize attached prescriptions via OCR, and share structured records with the attending clinician and India ABDM network. I retain the right to revoke consent at any time.
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <input 
              type="checkbox" 
              id="consent-check" 
              checked={consentGiven} 
              onChange={e => setConsentGiven(e.target.checked)} 
              style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }} 
            />
            <label htmlFor="consent-check" style={{ cursor: 'pointer', fontSize: '0.92rem', color: '#0f172a', fontWeight: 600 }}>
              I agree to the DPDP Act 2023 data processing scope
            </label>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!patientName.trim() || !consentGiven || isLoading}
            style={{ background: mode === 'ayush' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined }}
          >
            {isLoading ? 'Initializing Session...' : `Begin ${mode === 'ayush' ? 'AYUSH' : 'Allopathic'} Intake`}
            <ArrowRight size={18} />
          </button>
        </form>
      )}

      {/* STEP 2: Interactive Interview Loop */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <User size={18} color="#2563eb" />
              <span style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 700 }}>
                Patient: {patientName}
              </span>
              <span style={{ fontSize: '0.75rem', background: mode === 'ayush' ? '#ecfdf5' : '#eff6ff', color: mode === 'ayush' ? '#065f46' : '#1e40af', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                {mode.toUpperCase()} MODE
              </span>
            </div>
            <button 
              type="button" 
              className="tts-toggle" 
              onClick={() => setTtsEnabled(!ttsEnabled)}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{ttsEnabled ? 'Voice ON' : 'Voice OFF'}</span>
            </button>
          </div>

          <div className="chat-container">
            <div className="chat-history">
              {chatHistory.map((item, idx) => (
                <div key={idx} className={`chat-bubble ${item.speaker}`}>
                  <div className="speaker-badge">
                    <span>{item.speaker === 'ai' ? (mode === 'ayush' ? 'AYUSH Assistant' : 'AI Clinical Assistant') : patientName}</span>
                    <span className="turn-badge">Turn {item.turn}</span>
                    {item.inputMode && (
                      <span className="turn-badge" style={{ background: item.speaker === 'patient' ? 'rgba(255, 255, 255, 0.25)' : '#e0f2fe', color: item.speaker === 'patient' ? 'white' : '#0369a1' }}>
                        {item.inputMode}
                      </span>
                    )}
                  </div>
                  <div>{item.text}</div>
                </div>
              ))}
              {isLoading && (
                <div className="chat-bubble ai" style={{ opacity: 0.7 }}>
                  <em>MediKiosk is formulating the next intake question...</em>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Reply Symptom Chips */}
            {chips.length > 0 && (
              <div className="chips-container">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px', fontWeight: 700 }}>
                  Quick replies:
                </span>
                {chips.map((chip, idx) => (
                  <button 
                    key={idx} 
                    type="button" 
                    className="chip-button"
                    onClick={() => submitAnswer(chip, 'touch')}
                    disabled={isLoading}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <form 
              onSubmit={(e) => { e.preventDefault(); submitAnswer(inputAnswer, isListening ? 'voice' : 'touch'); }}
              className="chat-input-row"
            >
              <input 
                type="text" 
                className="chat-text-input" 
                placeholder={isListening ? 'Listening to your voice...' : 'Type your response here or tap mic...'} 
                value={inputAnswer}
                onChange={(e) => setInputAnswer(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="button" 
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
                title="Voice Input (Web Speech API)"
              >
                {isListening ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              <button type="submit" className="send-btn" disabled={!inputAnswer.trim() || isLoading}>
                <span>Send</span>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STEP 3: Document OCR Upload & Clinical Safety Flags */}
      {step === 3 && (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem', textAlign: 'center', color: '#0f172a' }}>
            Prescription Digitization & Safety Check
          </h3>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.92rem' }}>
            Scan paper reports to extract structured medicines and detect potential drug interactions or lab alerts
          </p>

          <label className="upload-dropzone">
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            <UploadCloud size={44} color="#2563eb" style={{ margin: '0 auto 0.6rem auto' }} />
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
              {isUploading ? 'Scanning document & running safety checks...' : 'Click to Upload Prescription or Lab Report'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Supports camera snapshots, PNG, or JPG images
            </div>
          </label>

          {/* Clinical Safety Flags Alert Panel */}
          {clinicalFlags.length > 0 && (
            <div style={{ background: 'var(--warning-bg)', border: '1.5px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '1.1rem', marginBottom: '1.5rem' }}>
              <div style={{ color: 'var(--warning-text)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                <ShieldAlert size={20} /> Clinical Safety Alerts ({clinicalFlags.length} detected)
              </div>
              {clinicalFlags.map((flag, idx) => (
                <div key={idx} style={{ fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.4rem', background: '#ffffff', padding: '0.6rem 0.9rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  {flag.flag_type === 'abnormal_value' ? (
                    <span>⚠️ <strong>{flag.detail.test_name}:</strong> Value {flag.detail.value} (Ref: {flag.detail.reference_range}) — Status: <strong style={{ color: '#dc2626' }}>{flag.detail.status}</strong></span>
                  ) : (
                    <span>🚫 <strong>Drug Interaction:</strong> {flag.detail.interacting_pair?.join(' + ')} — {flag.detail.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {uploadedDocs.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.92rem', color: 'var(--primary)', marginBottom: '0.6rem', fontWeight: 800 }}>
                Scanned Prescription Data ({uploadedDocs.length})
              </h4>
              {uploadedDocs.map((doc, i) => (
                <div key={i} className="ocr-result-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#0f172a' }}>Doc #{doc.document_id} ({doc.ocr_method})</strong>
                    <span className={`confidence-badge ${doc.confidence >= 0.6 ? 'confidence-high' : 'confidence-low'}`}>
                      {doc.confidence < 0.6 && <AlertTriangle size={14} />}
                      Confidence: {(doc.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleProceedToSummary}
            disabled={isLoading}
          >
            {isLoading ? 'Generating Summary...' : 'Generate Structured Clinical Summary'}
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* STEP 4: Review Summary & Real ABDM Push */}
      {step === 4 && (
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', textAlign: 'center', color: '#0f172a' }}>
            Intake Completed — [{mode.toUpperCase()}] Summary
          </h3>

          {summaryData && (
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.5px' }}>Chief Complaint</div>
                  <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '1.02rem', marginTop: '0.2rem' }}>{summaryData.chief_complaint?.text || 'Not reported.'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.5px' }}>History of Present Illness (HPI)</div>
                  <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '1.02rem', marginTop: '0.2rem' }}>{summaryData.hpi?.text || 'Not reported.'}</div>
                </div>
              </div>

              {/* AYUSH Assessment Block if mode === 'ayush' */}
              {mode === 'ayush' && (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', padding: '1.1rem', borderRadius: '16px', marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.88rem', color: '#065f46', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.6rem', letterSpacing: '0.5px' }}>
                    AYUSH Dashavidha Pariksha Summary Block
                  </h4>
                  <div style={{ fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.6 }}>
                    <div><strong>Prakriti Assessment:</strong> {summaryData.prakriti_assessment?.text}</div>
                    <div><strong>Agni / Koshtha:</strong> {summaryData.agni_koshtha?.text}</div>
                    <div><strong>Ahara & Vihara:</strong> {summaryData.ahara_vihara_habits?.text}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!abdmResult ? (
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handlePushToAbdm}
              disabled={isLoading}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              {isLoading ? 'Building FHIR R4 Bundle & Pushing...' : 'Push FHIR R4 Bundle to ABDM Network'}
              <ShieldCheck size={20} />
            </button>
          ) : (
            <div style={{ textAlign: 'center', background: 'var(--success-bg)', border: '1.5px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '1.75rem' }}>
              <CheckCircle2 size={46} color="#10b981" style={{ margin: '0 auto 0.6rem auto' }} />
              <h4 style={{ color: '#065f46', fontSize: '1.3rem', fontWeight: 800 }}>Pushed to India ABDM Health Network</h4>
              <p style={{ color: '#047857', fontSize: '0.95rem', marginBottom: '1.25rem', fontWeight: 600 }}>
                ABHA ID: <strong>{abdmResult.abha_id}</strong>
              </p>
              <button type="button" className="btn-primary" onClick={handleResetSession}>
                Start Next Patient Intake
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
