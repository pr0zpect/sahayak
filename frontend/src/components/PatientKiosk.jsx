import React, { useState, useEffect, useRef } from 'react';
import { startInterview, respondInterview, uploadDocument, generateSummary, pushAbdm, grantConsent, generateToken } from '../api';
import { translations } from '../translations';
import { 
  Mic, MicOff, Send, AlertTriangle, UploadCloud, CheckCircle2, 
  Volume2, VolumeX, ShieldCheck, ArrowRight, Activity, Leaf, ShieldAlert, Sparkles, User, Stethoscope 
} from 'lucide-react';

export default function PatientKiosk({ activeSessionId, setActiveSessionId, onSessionComplete }) {
  // Step state: 1: Consent/Mode, 2: Interview, 3: Document OCR & Clinical Flags, 4: Summary & ABDM Push
    // i18n helper
  const t = (key) => translations[language]?.[key] || translations['en'][key] || key;

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
  const [selectionMode, setSelectionMode] = useState('single');
  const [selectedChips, setSelectedChips] = useState([]);
  const [inputAnswer, setInputAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Red Flag State
  const [redFlag, setRedFlag] = useState(false);
  const [redFlagReason, setRedFlagReason] = useState('');

  // Speech State
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef(null);

  // OCR & {t('clinical_safety_flags')} State
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [clinicalFlags, setClinicalFlags] = useState([]);
  const [interactionAlerts, setInteractionAlerts] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Summary & ABDM State
  const [summaryData, setSummaryData] = useState(null);
  const [abdmResult, setAbdmResult] = useState(null);
  const [tokenData, setTokenData] = useState(null); // { token, counter_number, priority }
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
    
    // A timeout allows the browser audio queue to clear and prevent stuttering
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // CRITICAL FIX: Bind utterance to window to prevent garbage collection mid-speech (macOS/Chrome bug)
        window.currentUtterance = utterance;
        
        const langMapping = {
          en: 'en-US',
          hi: 'hi-IN',
          ta: 'ta-IN',
          te: 'te-IN',
          kn: 'kn-IN',
          bn: 'bn-IN',
          mr: 'mr-IN',
        };
        
        const targetLang = langMapping[language] || 'en-US';
        utterance.lang = targetLang;
        
        // Find best voice match for selected language, preferring premium 'Google' voices if available
        if (window.speechSynthesis.getVoices) {
          const voices = window.speechSynthesis.getVoices();
          const googleVoice = voices.find(v => 
            v.lang.replace('_', '-').toLowerCase().startsWith(targetLang.toLowerCase()) && 
            v.name.includes('Google')
          );
          const fallbackVoice = voices.find(v => 
            v.lang.replace('_', '-').toLowerCase().startsWith(targetLang.toLowerCase())
          );
          
          if (googleVoice) {
            utterance.voice = googleVoice;
          } else if (fallbackVoice) {
            utterance.voice = fallbackVoice;
          }
        }
        
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        
        utterance.onend = () => { window.currentUtterance = null; };
        utterance.onerror = () => { window.currentUtterance = null; };
        
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('TTS execution error:', err);
      }
    }, 250);
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
      setSelectionMode(data.selection_mode || 'single');
      setSelectedChips([]);
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
        setSelectionMode(res.selection_mode || 'single');
        setSelectedChips([]);
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
      if (docRes.interaction_alerts) {
        setInteractionAlerts(prev => [...prev, ...docRes.interaction_alerts]);
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
      // Auto-generate token + counter after ABDM push
      try {
        const tkn = await generateToken(activeSessionId);
        setTokenData(tkn);
      } catch (tokenErr) {
        console.error('Token generation failed:', tokenErr);
      }
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
    setInteractionAlerts([]);
    setSummaryData(null);
    setAbdmResult(null);
    setTokenData(null);
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
            <div className="red-flag-title">{t('emergency_alert')}</div>
            <div className="red-flag-desc">{redFlagReason || 'Emergency symptom detected. Staff notified.'}</div>
          </div>
        </div>
      )}

      <div className="step-indicator">
        <div className={`step-pill ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <span className="step-number">1</span> {t('step_1')}
        </div>
        <div className={`step-pill ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <span className="step-number">2</span> {mode === 'ayush' ? t('ayush_assistant') : t('step_2')}
        </div>
        <div className={`step-pill ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
          <span className="step-number">3</span> {t('step_3')}
        </div>
        <div className={`step-pill ${step === 4 ? 'active' : ''}`}>
          <span className="step-number">4</span> {t('step_4')}
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
              {t('welcome_title')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', marginTop: '0.2rem' }}>
              {t('welcome_desc')}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="form-group">
            <label className="form-label">{t('select_care_model')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div 
                className={`summary-card-field ${mode === 'allopathic' ? 'active-source' : ''}`}
                onClick={() => setMode('allopathic')}
                style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', borderRadius: '18px', background: mode === 'allopathic' ? '#eff6ff' : '#f8fafc', borderColor: mode === 'allopathic' ? '#2563eb' : '#e2e8f0' }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem auto' }}>
                  <Activity size={22} />
                </div>
                <strong style={{ color: '#0f172a', display: 'block', fontSize: '1rem', fontWeight: 700 }}>{t('mode_allopathic')}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('allopathic_desc')}</span>
              </div>
              <div 
                className={`summary-card-field ${mode === 'ayush' ? 'active-source' : ''}`}
                onClick={() => setMode('ayush')}
                style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', borderRadius: '18px', background: mode === 'ayush' ? '#ecfdf5' : '#f8fafc', borderColor: mode === 'ayush' ? '#10b981' : '#e2e8f0' }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem auto' }}>
                  <Leaf size={22} />
                </div>
                <strong style={{ color: '#0f172a', display: 'block', fontSize: '1rem', fontWeight: 700 }}>{t('mode_ayush')}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('ayush_desc')}</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('patient_full_name')}</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder={t('patient_name_placeholder')} 
              value={patientName} 
              onChange={e => setPatientName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('preferred_language')}</label>
            <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="en">{t('language_en')}</option>
              <option value="hi">{t('language_hi')}</option>
              <option value="ta">{t('language_ta')}</option>
              <option value="te">{t('language_te')}</option>
              <option value="kn">{t('language_kn')}</option>
              <option value="bn">{t('language_bn')}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('abha_id_optional')}</label>
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
              <ShieldCheck size={18} color="#10b981" /> {t('dpdp_title')}
            </strong>
            {t('dpdp_text')}
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
              {t('agree_dpdp')}
            </label>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!patientName.trim() || !consentGiven || isLoading}
            style={{ background: mode === 'ayush' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined }}
          >
            {isLoading ? t('initializing_session') : (mode === 'ayush' ? t('begin_intake_ayush') : t('begin_intake_allopathic'))}
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
                {t('patient_label')} {patientName}
              </span>
              <span style={{ fontSize: '0.75rem', background: mode === 'ayush' ? '#ecfdf5' : '#eff6ff', color: mode === 'ayush' ? '#065f46' : '#1e40af', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                {mode.toUpperCase()} {t('mode_suffix')}
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
                    <span>{item.speaker === 'ai' ? (mode === 'ayush' ? t('ayush_assistant') : t('ai_assistant')) : patientName}</span>
                    <span className="turn-badge">{t('turn_label')} {item.turn}</span>
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
                  <em>{t('thinking')}</em>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Reply Symptom Chips */}
            {chips.length > 0 && (
              <div className="chips-container" style={{ flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px', fontWeight: 700 }}>
                  {selectionMode === 'multi' ? t('select_all') : t('quick_replies')}
                </span>
                {chips.map((chip, idx) => {
                  const isSelected = selectedChips.includes(chip);
                  return (
                    <button 
                      key={idx} 
                      type="button" 
                      className={`chip-button ${isSelected ? 'selected' : ''}`}
                      style={isSelected ? { background: '#2563eb', color: 'white', borderColor: '#2563eb' } : {}}
                      onClick={() => {
                        if (selectionMode === 'multi') {
                          setSelectedChips(prev => 
                            prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
                          );
                        } else {
                          submitAnswer(chip, 'touch');
                        }
                      }}
                      disabled={isLoading}
                    >
                      {chip}
                    </button>
                  );
                })}
                {selectionMode === 'multi' && selectedChips.length > 0 && (
                  <button
                    type="button"
                    className="chip-button submit-multi"
                    style={{ background: '#10b981', color: 'white', borderColor: '#10b981', fontWeight: 700, marginLeft: 'auto' }}
                    onClick={() => submitAnswer(selectedChips.join(', '), 'touch')}
                    disabled={isLoading}
                  >
                    {t('done')} <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }}/>
                  </button>
                )}
              </div>
            )}

            <form 
              onSubmit={(e) => { e.preventDefault(); submitAnswer(inputAnswer, isListening ? 'voice' : 'touch'); }}
              className="chat-input-row"
            >
              <input 
                type="text" 
                className="chat-text-input" 
                placeholder={isListening ? t('listening') : t('type_placeholder')} 
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
                <span>{t('send')}</span>
                <Send size={16} />
              </button>
            </form>

            {/* Generate Summary Now — early exit button, visible from turn 2+ */}
            {chatHistory.filter(i => i.speaker === 'patient').length >= 1 && (
              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleProceedToSummary}
                  disabled={isLoading}
                  style={{
                    background: 'transparent',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <Sparkles size={14} />
                  {isLoading ? t('generating_summary') : t('generate_summary_now')}
                </button>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                  {t('finish_early_text')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Document OCR Upload & {t('clinical_safety_flags')} */}
      {step === 3 && (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem', textAlign: 'center', color: '#0f172a' }}>
            {t('step3_title')}
          </h3>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.92rem' }}>
            {t('step3_sub')}
          </p>

          <label className="upload-dropzone">
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            <UploadCloud size={44} color="#2563eb" style={{ margin: '0 auto 0.6rem auto' }} />
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
              {isUploading ? t('upload_scanning') : t('upload_click')}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              {t('upload_formats')}
            </div>
          </label>

          {/* {t('clinical_safety_flags')} Alert Panel */}
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
              {uploadedDocs.map((doc, i) => {
                const conf = doc.confidence ?? 0;
                const confPct = (conf * 100).toFixed(0);
                const confBadge = conf >= 0.8
                  ? { label: 'High confidence', bg: '#dcfce7', border: '#86efac', text: '#15803d', icon: '✓' }
                  : conf >= 0.5
                  ? { label: 'Medium confidence — please verify', bg: '#fef9c3', border: '#fde047', text: '#a16207', icon: '!' }
                  : { label: 'Low confidence — please confirm manually', bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', icon: '⚠' };
                return (
                  <div key={i} className="ocr-result-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <strong style={{ color: '#0f172a' }}>Doc #{doc.document_id} ({doc.ocr_method})</strong>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700,
                        background: confBadge.bg, border: `1.5px solid ${confBadge.border}`, color: confBadge.text
                      }}>
                        <span>{confBadge.icon}</span> {confPct}% — {confBadge.label}
                      </span>
                    </div>
                    {doc.fields?.medicines?.length > 0 && (
                      <div style={{ marginTop: '0.6rem', fontSize: '0.84rem', color: '#475569' }}>
                        <strong>Medicines:</strong> {doc.fields.medicines.join(', ')}
                      </div>
                    )}
                    {doc.fields?.diagnosis && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.84rem', color: '#475569' }}>
                        <strong>Diagnosis:</strong> {doc.fields.diagnosis}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Drug Interaction Alert Panel */}
          {uploadedDocs.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              {interactionAlerts.length > 0 ? (
                <div style={{ background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, color: '#92400e', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                    <AlertTriangle size={18} /> {interactionAlerts.length} potential drug interaction{interactionAlerts.length > 1 ? 's' : ''} flagged for clinician review
                  </div>
                  {interactionAlerts.map((alert, idx) => (
                    <div key={idx} style={{
                      background: '#ffffff', border: '1px solid #fde68a', borderRadius: '10px',
                      padding: '0.75rem 1rem', marginBottom: '0.5rem', fontSize: '0.87rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>
                          {alert.drug_a} <span style={{ color: '#94a3b8' }}>+</span> {alert.drug_b}
                        </span>
                        <span style={{
                          padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                          background: alert.severity === 'high' ? '#fef2f2' : '#fffbeb',
                          color: alert.severity === 'high' ? '#b91c1c' : '#92400e',
                          border: `1px solid ${alert.severity === 'high' ? '#fca5a5' : '#fde68a'}`
                        }}>
                          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)} severity
                        </span>
                      </div>
                      <div style={{ color: '#475569', lineHeight: 1.5 }}>{alert.note}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem', color: '#15803d', fontSize: '0.87rem', fontWeight: 600
                }}>
                  <CheckCircle2 size={17} /> No known interactions detected among extracted medicines
                </div>
              )}
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
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.5px' }}>{t('chief_complaint')}</div>
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
              {isLoading ? t('pushing') : t('push_to_doctor')}
              <ShieldCheck size={20} />
            </button>
          ) : (
            <div style={{ textAlign: 'center' }}>
              {/* Token + Counter Ticket Card — the most prominent element */}
              {tokenData && (
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  borderRadius: '20px',
                  padding: '2.5rem 2rem',
                  marginBottom: '1.5rem',
                  color: '#ffffff',
                  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.35)',
                  border: '2px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 700 }}>
                    {t('your_token')}
                  </div>
                  <div style={{
                    fontSize: '3.5rem',
                    fontWeight: 900,
                    letterSpacing: '6px',
                    color: '#38bdf8',
                    textShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
                    marginBottom: '1.25rem',
                    fontFamily: 'monospace',
                  }}>
                    {tokenData.token}
                  </div>
                  <div style={{ width: '60px', height: '2px', background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)', margin: '0 auto 1.25rem auto' }} />
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 700 }}>
                    {t('please_proceed')}
                  </div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}>
                    Counter {tokenData.counter_number}
                  </div>
                  {tokenData.priority && (
                    <div style={{
                      marginTop: '1rem',
                      display: 'inline-block',
                      background: '#dc2626',
                      color: '#fff',
                      padding: '0.35rem 1rem',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}>
                      ⚠ {t('priority_patient')}
                    </div>
                  )}
                </div>
              )}

              {/* ABDM confirmation */}
              <div style={{ background: 'var(--success-bg)', border: '1.5px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={28} color="#10b981" style={{ margin: '0 auto 0.4rem auto' }} />
                <h4 style={{ color: '#065f46', fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>{t('pushed_abdm_desc')}</h4>
                <p style={{ color: '#047857', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
                  ABHA ID: <strong>{abdmResult.abha_id}</strong>
                </p>
              </div>

              <button type="button" className="btn-primary" onClick={handleResetSession}>
                {t('start_next')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
