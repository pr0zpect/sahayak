import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Volume2, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../data/i18n';

const ConsentScreen = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const t = useTranslation(state.language);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAccept = () => {
    navigate('/patient/intake');
  };

  const handleDecline = () => {
    navigate('/');
  };

  const toggleAudio = () => {
    setIsPlaying(!isPlaying);
    // Mock audio play
    if (!isPlaying) {
      setTimeout(() => setIsPlaying(false), 3000);
    }
  };

  return (
    <div className="consent-page relative">
      <div className="consent-card">
        <div className="flex justify-between items-start mb-6">
          <div className="w-16 h-16 rounded-full bg-success-100 text-success-600 flex items-center justify-center" style={{ background: 'var(--color-success-100)', color: 'var(--color-success-600)' }}>
            <ShieldCheck size={32} />
          </div>
          <button 
            className={`btn btn-icon ${isPlaying ? 'bg-primary-100 text-primary-600' : 'btn-ghost'}`} 
            onClick={toggleAudio}
            style={isPlaying ? { background: 'var(--color-primary-100)', color: 'var(--color-primary-600)' } : {}}
            title={t('consent_listen')}
          >
            <Volume2 size={24} className={isPlaying ? 'animate-pulse' : ''} />
          </button>
        </div>

        <h1 className="heading-2 mb-4">{t('consent_title')}</h1>
        <p className="text-lg text-neutral-600 mb-8 leading-relaxed" style={{ color: 'var(--color-neutral-600)' }}>
          {t('consent_desc')}
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-success-500 flex-shrink-0 mt-1" style={{ color: 'var(--color-success-500)' }} />
            <p className="text-sm">{t('consent_bullet1')}</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-success-500 flex-shrink-0 mt-1" style={{ color: 'var(--color-success-500)' }} />
            <p className="text-sm">{t('consent_bullet2')}</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-success-500 flex-shrink-0 mt-1" style={{ color: 'var(--color-success-500)' }} />
            <p className="text-sm">{t('consent_bullet3')}</p>
          </div>
        </div>
        
        <div className="mb-8 p-4 rounded-xl bg-neutral-50 border" style={{ borderColor: 'var(--color-neutral-200)', background: 'var(--color-neutral-50)' }}>
          <h3 className="font-semibold mb-3 text-neutral-800">{t('consent_visit_type')}:</h3>
          <div className="flex gap-4">
            <label className="flex-1 cursor-pointer">
              <input type="radio" name="visitType" className="peer sr-only" checked={!state.ayushMode} onChange={() => { if(state.ayushMode) dispatch({ type: 'TOGGLE_AYUSH_MODE' }) }} />
              <div className="p-3 text-center rounded-lg border-2 border-transparent peer-checked:border-primary-500 peer-checked:bg-neutral-0 font-medium" style={{ borderColor: !state.ayushMode ? 'var(--color-primary-500)' : 'var(--color-neutral-200)', background: !state.ayushMode ? 'var(--color-primary-50)' : 'white' }}>
                {t('consent_general')}
              </div>
            </label>
            <label className="flex-1 cursor-pointer">
              <input type="radio" name="visitType" className="peer sr-only" checked={state.ayushMode} onChange={() => { if(!state.ayushMode) dispatch({ type: 'TOGGLE_AYUSH_MODE' }) }} />
              <div className="p-3 text-center rounded-lg border-2 border-transparent peer-checked:border-ayush-olive peer-checked:bg-ayush-bg font-medium" style={{ borderColor: state.ayushMode ? 'var(--color-ayush-olive)' : 'var(--color-neutral-200)', background: state.ayushMode ? 'var(--color-ayush-bg)' : 'white' }}>
                {t('consent_ayush')}
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t" style={{ borderTop: '1px solid var(--color-neutral-200)' }}>
          <button className="btn btn-primary btn-xl flex-1 text-lg" onClick={handleAccept}>
            {t('consent_accept')}
          </button>
          <button className="btn btn-secondary btn-lg" onClick={handleDecline}>
            {t('consent_decline')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentScreen;
