import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope, Building, Globe, ChevronDown, Phone, ShieldAlert, Sliders } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../data/i18n';
import { LANGUAGES } from '../data/mockData';

const Landing = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const t = useTranslation(state.language);

  // States
  const [showMoreLangs, setShowMoreLangs] = useState(false);
  const [fontSize, setFontSize] = useState('normal'); // normal | large

  const handleRoleSelect = (role) => {
    navigate(`/login/${role}`);
  };

  const handleLanguageChange = (code) => {
    dispatch({ type: 'SET_LANGUAGE', payload: code });
  };

  const toggleHighContrast = () => {
    dispatch({ type: 'TOGGLE_HIGH_CONTRAST' });
  };

  const adjustFontSize = (size) => {
    setFontSize(size);
    if (size === 'large') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }
  };

  // Main featured languages on the banner
  const featuredLangCodes = ['en', 'hi', 'mr'];
  const featuredLangs = LANGUAGES.filter(l => featuredLangCodes.includes(l.code));
  const remainingLangs = LANGUAGES.filter(l => !featuredLangCodes.includes(l.code));

  // Current language display name
  const currentLangObj = LANGUAGES.find(l => l.code === state.language) || LANGUAGES[0];

  return (
    <div className={`landing-c3-root contrast-${state.highContrast ? 'high' : 'normal'}`}>
      
      {/* ── 1. HEADER BAR ────────────────────────────────────── */}
      <header className="c3-header">
        <div className="c3-logo-area">
          <span className="c3-logo-main">Sahayak</span>
          <span className="c3-logo-divider">|</span>
          <span className="c3-logo-sub">सहायक</span>
        </div>
        
        <div className="c3-header-right">
          <div className="c3-quick-toggles">
            <button 
              className={`c3-quick-pill ${state.language === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              English
            </button>
            <button 
              className={`c3-quick-pill ${state.language === 'hi' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('hi')}
            >
              हिन्दी
            </button>
            <button 
              className={`c3-quick-more-btn ${showMoreLangs ? 'active' : ''}`}
              onClick={() => setShowMoreLangs(!showMoreLangs)}
              aria-label="More languages"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. FULL LANGUAGE SELECTION BANNER ─────────────────── */}
      <section className="c3-lang-banner" aria-label="Language selection banner">
        <div className="c3-lang-banner-inner">
          <span className="c3-lang-banner-label">
            {state.language === 'hi' ? 'भाषा' : state.language === 'mr' ? 'भाषा' : 'Language'}:
          </span>
          <div className="c3-lang-pills">
            {featuredLangs.map((lang) => (
              <button
                key={lang.code}
                className={`c3-lang-pill ${state.language === lang.code ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                {lang.native}
              </button>
            ))}
            <button 
              className={`c3-lang-pill c3-lang-more-btn ${showMoreLangs ? 'active' : ''}`}
              onClick={() => setShowMoreLangs(!showMoreLangs)}
            >
              {state.language === 'hi' ? 'अधिक भाषाएँ' : state.language === 'mr' ? 'इतर भाषा' : 'More languages'}...
            </button>
          </div>
        </div>

        {/* Expandable overflow language drawer */}
        {showMoreLangs && (
          <div className="c3-lang-drawer">
            <div className="c3-lang-drawer-grid">
              {remainingLangs.map((lang) => (
                <button
                  key={lang.code}
                  className={`c3-drawer-lang-btn ${state.language === lang.code ? 'active' : ''}`}
                  onClick={() => {
                    handleLanguageChange(lang.code);
                    setShowMoreLangs(false);
                  }}
                >
                  <span className="c3-drawer-lang-native">{lang.native}</span>
                  <span className="c3-drawer-lang-label">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 3. ROLE SELECTION CARDS ───────────────────────────── */}
      <main className="c3-main-content">
        <div className="c3-roles-grid">
          
          {/* Patient Card */}
          <div className="c3-role-card patient-card">
            <div className="c3-card-icon-wrap">
              <User size={40} strokeWidth={1.5} />
            </div>
            <h2 className="c3-card-title">{t('role_patient')}</h2>
            <p className="c3-card-desc">{t('role_patient_desc')}</p>
            <button 
              onClick={() => handleRoleSelect('patient')}
              className="c3-card-btn patient-btn"
              id="role-btn-patient"
            >
              {t('role_patient')} Portal &rarr;
            </button>
          </div>

          {/* Doctor Card */}
          <div className="c3-role-card doctor-card">
            <div className="c3-card-icon-wrap">
              <Stethoscope size={40} strokeWidth={1.5} />
            </div>
            <h2 className="c3-card-title">{t('role_doctor')}</h2>
            <p className="c3-card-desc">{t('role_doctor_desc')}</p>
            <button 
              onClick={() => handleRoleSelect('doctor')}
              className="c3-card-btn doctor-btn"
              id="role-btn-doctor"
            >
              {t('role_doctor')} Access &rarr;
            </button>
          </div>

          {/* Admin Card */}
          <div className="c3-role-card admin-card">
            <div className="c3-card-icon-wrap">
              <Building size={40} strokeWidth={1.5} />
            </div>
            <h2 className="c3-card-title">{t('role_admin')}</h2>
            <p className="c3-card-desc">{t('role_admin_desc')}</p>
            <button 
              onClick={() => handleRoleSelect('admin')}
              className="c3-card-btn admin-btn"
              id="role-btn-admin"
            >
              {t('role_admin')} Portal &rarr;
            </button>
          </div>

        </div>
      </main>

      {/* ── 4. FOOTER ────────────────────────────────────────── */}
      <footer className="c3-footer">
        <div className="c3-footer-top">
          <div className="c3-footer-creds">
            Smart India Hackathon 2026 Demo &nbsp;·&nbsp; Problem Statement #26047
          </div>
          
          <div className="c3-footer-links">
            <a href="#about" onClick={(e) => e.preventDefault()}>About</a>
            <span className="c3-footer-dot">•</span>
            <a href="#ministry" onClick={(e) => e.preventDefault()}>Ministry of Health</a>
            <span className="c3-footer-dot">•</span>
            <div className="c3-hotline-badge">
              <ShieldAlert size={14} />
              <span>OPD Emergency: <strong>102 / 1075</strong></span>
            </div>
          </div>
        </div>

        {/* Accessibility controls panel */}
        <div className="c3-accessibility-bar">
          <div className="c3-acc-control">
            <span className="c3-acc-label">Text Size:</span>
            <button 
              className={`c3-acc-btn ${fontSize === 'normal' ? 'active' : ''}`}
              onClick={() => adjustFontSize('normal')}
              aria-label="Normal text size"
            >
              A-
            </button>
            <button 
              className={`c3-acc-btn ${fontSize === 'large' ? 'active' : ''}`}
              onClick={() => adjustFontSize('large')}
              aria-label="Large text size"
            >
              A+
            </button>
          </div>

          <div className="c3-acc-control">
            <span className="c3-acc-label">Contrast:</span>
            <button 
              className={`c3-acc-btn ${state.highContrast ? 'active' : ''}`}
              onClick={toggleHighContrast}
              aria-label="Toggle high contrast mode"
            >
              High Contrast
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
