import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, FileText, Check, ChevronRight, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';
import { QUESTION_TREE, INTAKE_SECTIONS, AYUSH_SECTIONS } from '../../data/questionTree';
import RedFlagAlert from '../../components/RedFlagAlert';

const IntakeFlow = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const t = useTranslation(state.language);
  const scrollRef = useRef(null);

  const [currentNodeId, setCurrentNodeId] = useState('q_initial');
  const [history, setHistory] = useState([]); // Array of { node: Node, answer: string, type: 'ai' | 'user' }
  const [isListening, setIsListening] = useState(false);
  const [simulatedTranscript, setSimulatedTranscript] = useState('');
  
  // Accumulated Answers Data
  const [intakeData, setIntakeData] = useState({});

  const sections = state.ayushMode ? AYUSH_SECTIONS : INTAKE_SECTIONS;
  const currentNode = QUESTION_TREE[currentNodeId];

  // Initialize with first question
  useEffect(() => {
    if (history.length === 0 && currentNode) {
      setHistory([{ id: `sys-${Date.now()}`, node: currentNode, text: currentNode.question, type: 'ai' }]);
    }
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, simulatedTranscript]);

  const handleAnswer = (answer, nextNodeIdOrAction, stateKey) => {
    // 1. Save the answer to state
    if (stateKey) {
      setIntakeData(prev => {
        const newData = { ...prev };
        const keys = stateKey.split('.');
        if (keys.length === 2) {
          if (!newData[keys[0]]) newData[keys[0]] = {};
          
          // Handle arrays vs strings
          if (currentNode.isMulti) {
             if (!newData[keys[0]][keys[1]]) newData[keys[0]][keys[1]] = [];
             if (!newData[keys[0]][keys[1]].includes(answer)) {
                newData[keys[0]][keys[1]].push(answer);
             }
          } else {
            newData[keys[0]][keys[1]] = answer;
          }
        }
        return newData;
      });
    }

    // 2. Add user response to history
    setHistory(prev => [...prev, { id: `usr-${Date.now()}`, text: answer, type: 'user' }]);

    // 3. Check for red flags
    if (currentNode.redFlagCheck) {
      const flagReason = currentNode.redFlagCheck(answer, intakeData);
      if (flagReason) {
        dispatch({ 
          type: 'TRIGGER_RED_FLAG', 
          payload: { 
            patientId: state.currentUser.id, 
            patientName: state.currentUser.name,
            message: flagReason 
          } 
        });
      }
    }

    // 4. Determine next step
    if (nextNodeIdOrAction === 'END') {
      // Save temp data to context and navigate to summary
      dispatch({ type: 'UPDATE_INTAKE_TEMP', payload: intakeData });
      navigate('/patient/intake/summary');
      return;
    }

    if (nextNodeIdOrAction) {
      const nextNode = QUESTION_TREE[nextNodeIdOrAction];
      
      if (nextNode.isSilent) {
         // Evaluate silent node logic
         const evaluatedNext = nextNode.evaluateNext({ ...intakeData, ayushMode: state.ayushMode });
         if (evaluatedNext === 'END') {
            navigate('/patient/intake/summary');
         } else {
           setCurrentNodeId(evaluatedNext);
           setHistory(prev => [...prev, { id: `sys-${Date.now()}`, node: QUESTION_TREE[evaluatedNext], text: QUESTION_TREE[evaluatedNext].question, type: 'ai' }]);
         }
      } else {
        setCurrentNodeId(nextNodeIdOrAction);
        // Delay AI response slightly for natural feel
        setTimeout(() => {
          setHistory(prev => [...prev, { id: `sys-${Date.now()}`, node: nextNode, text: nextNode.question, type: 'ai' }]);
        }, 500);
      }
    }
  };

  const simulateVoiceInput = (targetAnswer, nextNodeId, stateKey) => {
    setIsListening(true);
    setSimulatedTranscript('');
    
    // Simulate words appearing one by one
    const words = targetAnswer.split(' ');
    let currentText = '';
    let i = 0;
    
    const interval = setInterval(() => {
      if (i < words.length) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setSimulatedTranscript(currentText);
        i++;
      } else {
        clearInterval(interval);
        setIsListening(false);
        setTimeout(() => {
          setSimulatedTranscript('');
          handleAnswer(targetAnswer, nextNodeId, stateKey);
        }, 800);
      }
    }, 250);
  };

  // Helper to translate chat message or options dynamically
  const translateText = (text) => {
    if (!text) return '';
    const cleanedKey = 'opt_' + text.replace(/\//g, '_').replace(/ /g, '_').replace(/&/g, '_').replace(/-/g, '_');
    const translatedDirect = t(text);
    if (translatedDirect !== text) return translatedDirect;
    const translatedCleaned = t(cleanedKey);
    if (translatedCleaned !== cleanedKey) return translatedCleaned;
    return text;
  };

  // Calculate Progress
  const currentSectionIndex = sections.findIndex(s => s.id === currentNode?.section);
  
  if (!currentNode) return null;

  return (
    <div className="intake-flow">
      <RedFlagAlert />
      
      {/* Top Progress Bar */}
      <div className="progress-bar-container">
        {sections.map((section, idx) => (
          <React.Fragment key={section.id}>
            <div className={`progress-step ${idx < currentSectionIndex ? 'completed' : idx === currentSectionIndex ? 'active' : ''}`}>
              <div className="progress-step-dot">
                {idx < currentSectionIndex ? <Check size={16} /> : idx + 1}
              </div>
              <span className="hidden md:inline">{t('sec_' + section.id)}</span>
            </div>
            {idx < sections.length - 1 && <div className="progress-step-line" />}
          </React.Fragment>
        ))}
      </div>

      {/* Chat Area */}
      <div className="chat-container" ref={scrollRef}>
        <div className="text-center text-sm text-muted my-4">
          Today, {new Date().toLocaleDateString()}
        </div>

        {history.map((msg) => (
          <div key={msg.id} className={`chat-bubble ${msg.type === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}`}>
            {translateText(msg.text)}
          </div>
        ))}
        
        {isListening && (
          <div className="chat-bubble chat-bubble-user opacity-80">
            {simulatedTranscript || <div className="flex items-center gap-1"><span className="typing-dot"></span><span className="typing-dot"></span><span className="typing-dot"></span></div>}
          </div>
        )}
      </div>

      {/* Input Panel - Fixed at bottom */}
      {!isListening && (
        <div className="intake-input-panel">
          
          {/* Options (Chips) */}
          {currentNode.options && (
            <div className="intake-chips">
              {currentNode.options.map((opt, idx) => (
                <button 
                  key={idx} 
                  className="chip chip-lg"
                  onClick={() => handleAnswer(opt.label, opt.nextId || currentNode.nextId, currentNode.stateUpdate?.key)}
                >
                  {translateText(opt.label)}
                </button>
              ))}
            </div>
          )}

          {/* Special UI for Document Upload Node */}
          {currentNode.id === 'q_drug_history' && (
            <div className="w-full max-w-md mt-4">
              <div className="upload-zone p-6" onClick={() => handleAnswer("Uploaded Prescription", 'q_allergy_history', 'drugHistory.current')}>
                <Upload size={32} className="text-primary-500 mx-auto mb-2" style={{ color: 'var(--color-primary-500)' }} />
                <div className="font-semibold">{t('intake_upload_doc')}</div>
                <div className="text-sm text-muted">Tap to use camera or select file</div>
              </div>
            </div>
          )}

          {/* Voice Input */}
          {currentNode.options && (
            <>
              <div className="intake-or-divider">{t('intake_or')}</div>
              <div className="intake-voice-area">
                <button 
                  className="mic-btn"
                  onClick={() => simulateVoiceInput(currentNode.options[0].label, currentNode.options[0].nextId || currentNode.nextId, currentNode.stateUpdate?.key)}
                >
                  <Mic size={32} />
                </button>
                <span className="intake-voice-label">{t('intake_tap_mic')}</span>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
};

export default IntakeFlow;
