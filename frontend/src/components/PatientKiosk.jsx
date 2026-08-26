import React, { useState, useEffect, useRef } from 'react';
import { startInterview, respondInterview, uploadDocument, generateSummary, pushMockAbdm } from '../api';
import { 
  Mic, MicOff, Send, AlertTriangle, UploadCloud, CheckCircle2, 
  Volume2, VolumeX, ShieldCheck, ArrowRight, FileText, Check 
} from 'lucide-react';

export default function PatientKiosk({ activeSessionId, setActiveSessionId, onSessionComplete }) {
  // Step state: 1: Consent/Info, 2: Q&A Interview, 3: Document OCR, 4: Summary Recap, 5: ABHA Push
  const [step, setStep] = useState(1);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [language, setLanguage] = useState('en');
  const [abhaId, setAbhaId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  // Chat State
  const [chatHistory, setChatHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [chips, setChips] = useState([]);
  const [inputAnswer, setInputAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Red Flag State
  const [redFlag, setRedFlag] = useState(false);
  const [redFlagReason, setRedFlagReason] = useState('');

  // Speech Recognition (STT) & Synthesis (TTS) State
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef(null);

  // OCR Upload State
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Summary & ABDM State
  const [summaryData, setSummaryData] = useState(null);
  const [abdmResult, setAbdmResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  // Setup Web Speech API for Client-Side STT
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

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  // Speech Synthesis helper
  const speakText = (text) => {
    if (!ttsEnabled || !('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // Step 1: Start Interview
  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!patientName.trim() || !consentGiven) return;

    setIsLoading(true);
    try {
      const data = await startInterview(patientName.trim(), language, abhaId.trim() || null);
      setActiveSessionId(data.session_id);
      setCurrentQuestion(data.question);
      setChips(data.chips || []);
      setChatHistory([
        { turn: 1, speaker: 'ai', text: data.question }
      ]);
      setStep(2);
      speakText(data.question);
    } catch (err) {
      alert('Failed to start interview. Make sure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit Answer (via Touch/Type or Voice)
  const submitAnswer = async (answerText, mode = 'touch') => {
    if (!answerText.trim() || isLoading) return;

    const userText = answerText.trim();
    setInputAnswer('');
    setIsLoading(true);

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    // Add user message to UI chat history
    const nextTurnNum = chatHistory.length + 1;
    const updatedHistory = [
      ...chatHistory,
      { turn: nextTurnNum, speaker: 'patient', text: userText, inputMode: mode }
    ];
    setChatHistory(updatedHistory);

    try {
      const res = await respondInterview(activeSessionId, userText, mode);

      // Check Red Flag
      if (res.red_flag) {
        setRedFlag(true);
        setRedFlagReason(res.red_flag_reason || 'Emergency phrase detected.');
      }

      if (res.done) {
        // Interview finished, move to document upload step
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
      console.error('Error submitting answer:', err);
      alert('Failed to send answer to server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Speech Recognition
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Web Speech API is not supported in this browser. Please use Chrome/Edge or type your response.');
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
        console.error('Could not start recognition:', e);
      }
    }
  };

  // Step 3: Handle OCR Document Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const docRes = await uploadDocument(activeSessionId, file);
      setUploadedDocs(prev => [...prev, docRes]);
    } catch (err) {
      alert('Failed to upload and scan document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Move to Summary Generation Step
  const handleProceedToSummary = async () => {
    setIsLoading(true);
    try {
      const summary = await generateSummary(activeSessionId);
      setSummaryData(summary);
      setStep(4);
    } catch (err) {
      alert('Failed to generate clinical summary.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5: Mock ABDM Push
  const handlePushToAbdm = async () => {
    setIsLoading(true);
    try {
      const res = await pushMockAbdm(activeSessionId);
      setAbdmResult(res);
      setToastMessage(`Pushed to ABHA ✓ (${res.abha_id})`);
      setStep(5);
    } catch (err) {
      alert('Failed to push record to ABDM.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Session to Start New Intake
  const handleResetSession = () => {
    if (onSessionComplete) onSessionComplete();
    setActiveSessionId(null);
    setStep(1);
    setPatientName('');
    setAbhaId('');
    setConsentGiven(false);
    setChatHistory([]);
    setRedFlag(false);
    setRedFlagReason('');
    setUploadedDocs([]);
    setSummaryData(null);
    setAbdmResult(null);
    setToastMessage(null);
  };

  return (
    <div className="kiosk-card">
      {/* Toast Confirmation Banner */}
      {toastMessage && (
        <div className="toast-badge">
          <CheckCircle2 size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Red Flag Alert Header */}
      {redFlag && (
        <div className="red-flag-banner">
          <div className="red-flag-icon">!</div>
          <div>
            <div className="red-flag-title">EMERGENCY ALERT: Immediate Clinical Escalate</div>
            <div className="red-flag-desc">{redFlagReason || 'Emergency symptom detected. A triage nurse has been notified.'}</div>
          </div>
        </div>
      )}

      {/* Step Navigation Pill Indicator */}
      <div className="step-indicator">
        <div className={`step-pill ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <span className="step-number">1</span> Consent
        </div>
        <div className={`step-pill ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <span className="step-number">2</span> Interview
        </div>
        <div className={`step-pill ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
          <span className="step-number">3</span> OCR Documents
        </div>
        <div className={`step-pill ${step === 4 || step === 5 ? 'active' : ''}`}>
          <span className="step-number">4</span> Review & Push
        </div>
      </div>

      {/* STEP 1: Consent & Patient Intake Form */}
      {step === 1 && (
        <form onSubmit={handleStartSession} className="consent-form">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            Welcome to MediKiosk
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.92rem' }}>
            Pre-consultation adaptive intake & digital health records integration
          </p>

          <div className="form-group">
            <label className="form-label">Patient Full Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Asha Sharma" 
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
            <label className="form-label">ABHA Health ID (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. 91-1234-5678-9012" 
              value={abhaId} 
              onChange={e => setAbhaId(e.target.value)} 
            />
          </div>

          <div className="consent-box">
            <strong style={{ color: 'white' }}>Patient Consent & Privacy Terms:</strong><br />
            I agree to participate in this automated clinical intake interview. The data collected will be structured for doctor review and stored securely. In case of emergency symptoms, immediate medical staff notification will be triggered.
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
              I understand and give consent to begin the intake interview
            </label>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!patientName.trim() || !consentGiven || isLoading}
          >
            {isLoading ? 'Initializing Session...' : 'Begin Intake Interview'}
            <ArrowRight size={18} />
          </button>
        </form>
      )}

      {/* STEP 2: Interactive Adaptive Interview Loop */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Session #{activeSessionId} — Patient: <strong style={{ color: 'white' }}>{patientName}</strong>
            </span>
            <button 
              type="button" 
              className="tts-toggle" 
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title="Toggle Audio Read-Aloud"
            >
              {ttsEnabled ? <Volume2 size={18} color="#06b6d4" /> : <VolumeX size={18} />}
              <span>{ttsEnabled ? 'Voice Playback ON' : 'Voice Playback OFF'}</span>
            </button>
          </div>

          <div className="chat-container">
            {/* Chat History View */}
            <div className="chat-history">
              {chatHistory.map((item, idx) => (
                <div key={idx} className={`chat-bubble ${item.speaker}`}>
                  <div className="speaker-badge">
                    <span>{item.speaker === 'ai' ? 'AI Clinical Assistant' : patientName}</span>
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
                  <em>MediKiosk AI is formulating the next SOCRATES question...</em>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Reply Chips */}
            {chips.length > 0 && (
              <div className="chips-container">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', alignSelf: 'center', marginRight: '4px' }}>
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

            {/* Input Row: Free-text + Voice Mic Button */}
            <form 
              onSubmit={(e) => { e.preventDefault(); submitAnswer(inputAnswer, isListening ? 'voice' : 'touch'); }}
              className="chat-input-row"
            >
              <input 
                type="text" 
                className="chat-text-input" 
                placeholder={isListening ? 'Listening to your voice...' : 'Type your response here or tap the mic...'} 
                value={inputAnswer}
                onChange={(e) => setInputAnswer(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="button" 
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
                title={isListening ? 'Stop Listening' : 'Speak your answer (Web Speech API)'}
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

      {/* STEP 3: Document OCR Upload Step */}
      {step === 3 && (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            Prescription & Medical Records Digitization (OCR)
          </h3>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Upload any past doctor prescriptions, lab reports, or discharge slips to extract structured medicines and history.
          </p>

          <label className="upload-dropzone">
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            <UploadCloud size={42} color="#6366f1" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
              {isUploading ? 'Extracting text with Tesseract OCR...' : 'Click to Upload Prescription Image'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Supports PNG, JPG, or camera snapshots
            </div>
          </label>

          {/* List of uploaded & parsed documents */}
          {uploadedDocs.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--accent)' }}>
                Extracted Prescription Data ({uploadedDocs.length})
              </h4>
              {uploadedDocs.map((doc, i) => (
                <div key={i} className="ocr-result-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ color: 'white', fontSize: '0.9rem' }}>Document #{doc.document_id}</strong>
                    <span className={`confidence-badge ${doc.confidence >= 0.6 ? 'confidence-high' : 'confidence-low'}`}>
                      {doc.confidence < 0.6 && <AlertTriangle size={14} />}
                      OCR Confidence: {(doc.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {doc.fields?.diagnosis && (
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                      <strong>Diagnosis:</strong> {doc.fields.diagnosis}
                    </div>
                  )}
                  {doc.fields?.medicines?.length > 0 && (
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                      <strong>Medicines Found:</strong> {doc.fields.medicines.join(', ')}
                    </div>
                  )}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.4rem' }}>
                    "{doc.extracted_text.slice(0, 120)}..."
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
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
        </div>
      )}

      {/* STEP 4 & 5: Patient Summary Review & Mock ABDM Push */}
      {(step === 4 || step === 5) && (
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            Intake Completed — Doctor Ready Summary
          </h3>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Your structured intake has been recorded and link-traced.
          </p>

          {summaryData && (
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>Chief Complaint</div>
                  <div style={{ color: 'white', fontWeight: 600, marginTop: '0.2rem' }}>{summaryData.chief_complaint?.text || 'Not reported.'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>History of Present Illness (HPI)</div>
                  <div style={{ color: 'white', fontWeight: 600, marginTop: '0.2rem' }}>{summaryData.hpi?.text || 'Not reported.'}</div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handlePushToAbdm}
              disabled={isLoading}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              {isLoading ? 'Pushing to ABDM...' : 'Confirm & Push to ABHA Health Record'}
              <ShieldCheck size={20} />
            </button>
          )}

          {step === 5 && abdmResult && (
            <div style={{ textAlign: 'center', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
              <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.25rem' }}>Pushed to India ABDM Health Network</h4>
              <p style={{ color: 'var(--success-text)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                ABHA ID: <strong>{abdmResult.abha_id}</strong>
              </p>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleResetSession}
              >
                Session Wiped — Start Next Patient Intake
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
