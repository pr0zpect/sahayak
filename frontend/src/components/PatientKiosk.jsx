import React, { useState, useEffect, useRef } from 'react';
import { startInterview, respondInterview, uploadDocument, generateSummary, pushAbdm, grantConsent } from '../api';
import { 
  Mic, MicOff, Send, AlertTriangle, UploadCloud, CheckCircle2, 
  Volume2, VolumeX, ShieldCheck, ArrowRight, Activity, Leaf, ShieldAlert, Info 
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
      
      // Grant DPDP Consent Record
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
          <span className="step-number">3</span> OCR & Clinical Flags
        </div>
        <div className={`step-pill ${step === 4 ? 'active' : ''}`}>
          <span className="step-number">4</span> Review & ABDM
        </div>
      </div>

      {/* STEP 1: Mode Selection & DPDP Act 2023 Consent */}
      {step === 1 && (
        <form onSubmit={handleStartSession} className="consent-form">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', marginBottom: '0.25rem', textAlign: 'center' }}>
            MediKiosk Clinical Intake
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Select intake mode, preferred language, and privacy preferences
          </p>

          {/* Mode Switcher */}
          <div className="form-group">
            <label className="form-label">Clinical Intake Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div 
                className={`summary-card-field ${mode === 'allopathic' ? 'active-source' : ''}`}
                onClick={() => setMode('allopathic')}
                style={{ padding: '0.85rem', cursor: 'pointer', textAlign: 'center' }}
              >
                <Activity size={22} color="#6366f1" style={{ margin: '0 auto 0.4rem auto' }} />
                <strong style={{ color: 'white', display: 'block', fontSize: '0.95rem' }}>Allopathic Medicine</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Standard SOCRATES OPD History</span>
              </div>
              <div 
                className={`summary-card-field ${mode === 'ayush' ? 'active-source' : ''}`}
                onClick={() => setMode('ayush')}
                style={{ padding: '0.85rem', cursor: 'pointer', textAlign: 'center' }}
              >
                <Leaf size={22} color="#10b981" style={{ margin: '0 auto 0.4rem auto' }} />
                <strong style={{ color: 'white', display: 'block', fontSize: '0.95rem' }}>AYUSH (Ayurvedic)</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dashavidha Pariksha & Agni</span>
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
            <label className="form-label">Language</label>
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
            <strong style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <ShieldCheck size={16} color="#10b981" /> DPDP Act 2023 Consent Declaration
            </strong>
            I grant permission for MediKiosk to record my clinical history, digitize attached prescriptions via OCR, and share structured records with the attending clinician and India ABDM network. I retain the right to revoke consent at any time.
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <input 
              type="checkbox" 
              id="consent-check" 
              checked={consentGiven} 
              onChange={e => setConsentGiven(e.target.checked)} 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
            />
            <label htmlFor="consent-check" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'white' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Session #{activeSessionId} — [{mode.toUpperCase()}] Patient: <strong style={{ color: 'white' }}>{patientName}</strong>
            </span>
            <button 
              type="button" 
              className="tts-toggle" 
              onClick={() => setTtsEnabled(!ttsEnabled)}
            >
              {ttsEnabled ? <Volume2 size={18} color="#06b6d4" /> : <VolumeX size={18} />}
              <span>{ttsEnabled ? 'Voice Playback ON' : 'Voice Playback OFF'}</span>
            </button>
          </div>

          <div className="chat-container">
            <div className="chat-history">
              {chatHistory.map((item, idx) => (
                <div key={idx} className={`chat-bubble ${item.speaker}`}>
                  <div className="speaker-badge">
                    <span>{item.speaker === 'ai' ? (mode === 'ayush' ? 'AYUSH Assistant' : 'AI Assistant') : patientName}</span>
                    <span className="turn-badge">Turn {item.turn}</span>
                    {item.inputMode && (
                      <span className="turn-badge" style={{ background: 'rgba(6, 182, 212, 0.25)', color: '#67e8f9' }}>
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

            {chips.length > 0 && (
              <div className="chips-container">
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
                placeholder={isListening ? 'Listening...' : 'Type your answer or tap mic...'} 
                value={inputAnswer}
                onChange={(e) => setInputAnswer(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="button" 
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
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
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.4rem', textAlign: 'center' }}>
            Prescription OCR & Clinical Safety Scan
          </h3>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            Digitize handwritten/printed reports and scan for lab abnormal values or drug interactions
          </p>

          <label className="upload-dropzone">
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            <UploadCloud size={40} color="#6366f1" style={{ margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontWeight: 700, color: 'white' }}>
              {isUploading ? 'Scanning document & running safety checks...' : 'Upload Prescription or Lab Report Image'}
            </div>
          </label>

          {/* Clinical Safety Flags Alert Panel */}
          {clinicalFlags.length > 0 && (
            <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ color: 'var(--warning-text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <ShieldAlert size={18} /> Clinical Safety Alerts ({clinicalFlags.length} detected)
              </div>
              {clinicalFlags.map((flag, idx) => (
                <div key={idx} style={{ fontSize: '0.85rem', color: 'white', marginBottom: '0.35rem' }}>
                  {flag.flag_type === 'abnormal_value' ? (
                    <span>⚠️ <strong>{flag.detail.test_name}:</strong> Value {flag.detail.value} (Ref: {flag.detail.reference_range}) — Status: {flag.detail.status}</span>
                  ) : (
                    <span>🚫 <strong>Drug Interaction:</strong> {flag.detail.interacting_pair?.join(' + ')} — {flag.detail.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {uploadedDocs.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                Scanned Prescriptions ({uploadedDocs.length})
              </h4>
              {uploadedDocs.map((doc, i) => (
                <div key={i} className="ocr-result-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'white' }}>Doc #{doc.document_id} ({doc.ocr_method})</strong>
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
            {isLoading ? 'Generating Summary...' : 'Generate Clinical Summary'}
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* STEP 4: Review Summary & Real ABDM Push */}
      {step === 4 && (
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            Intake Completed — [{mode.toUpperCase()}] Clinical Summary
          </h3>

          {summaryData && (
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>Chief Complaint</div>
                  <div style={{ color: 'white', fontWeight: 600 }}>{summaryData.chief_complaint?.text || 'Not reported.'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>HPI</div>
                  <div style={{ color: 'white', fontWeight: 600 }}>{summaryData.hpi?.text || 'Not reported.'}</div>
                </div>
              </div>

              {/* AYUSH Assessment Block if mode === 'ayush' */}
              {mode === 'ayush' && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
                    AYUSH Dashavidha Pariksha Block
                  </h4>
                  <div style={{ fontSize: '0.88rem', color: 'white' }}>
                    <div><strong>Prakriti:</strong> {summaryData.prakriti_assessment?.text}</div>
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
            <div style={{ textAlign: 'center', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
              <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
              <h4 style={{ color: 'white', fontSize: '1.2rem' }}>Pushed to India ABDM Health Network</h4>
              <p style={{ color: 'var(--success-text)', fontSize: '0.9rem', marginBottom: '1rem' }}>
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
