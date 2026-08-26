import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Stethoscope, Shield, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../data/i18n';
import { DEPARTMENTS } from '../data/mockData';

const Login = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const t = useTranslation(state.language);

  // UI state
  const [isRegistering, setIsRegistering] = useState(false);
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');
  const [verifyState, setVerifyState] = useState('idle'); // idle | verifying | verified
  const [formData, setFormData] = useState({});

  // --- Role-specific config ---
  const roleConfig = {
    patient: {
      icon: User,
      title: t('login_title_patient'),
      field1Label: t('login_field1_patient'),
      field1Placeholder: '12-3456-7890-1234',
      field1Default: '12-3456-7890-1234',
      field2Label: t('login_field2_patient'),
      field2Placeholder: t('login_enter_otp'),
      field2Type: 'text',
    },
    doctor: {
      icon: Stethoscope,
      title: t('login_title_doctor'),
      field1Label: t('login_field1_doctor'),
      field1Placeholder: 'DOC-001',
      field1Default: 'DOC-001',
      field2Label: t('login_field2_doctor'),
      field2Placeholder: t('login_enter_password'),
      field2Type: 'password',
    },
    admin: {
      icon: Shield,
      title: t('login_title_admin'),
      field1Label: t('login_field1_admin'),
      field1Placeholder: 'ADM-001',
      field1Default: 'ADM-001',
      field2Label: t('login_field2_admin'),
      field2Placeholder: t('login_enter_password'),
      field2Type: 'password',
    },
  };

  const config = roleConfig[role];
  if (!config) {
    navigate('/', { replace: true });
    return null;
  }

  // --- Handlers ---
  const handleVerify = () => {
    if (!field1.trim()) return;
    setVerifyState('verifying');
    // Simulate verification delay
    setTimeout(() => {
      setVerifyState('verified');
    }, 800);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (verifyState !== 'verified' || !field2.trim()) return;

    let userToLogin = null;
    if (role === 'patient') {
      userToLogin = state.patients[0];
    } else if (role === 'doctor') {
      userToLogin = state.doctors[0];
    } else {
      userToLogin = { id: 'ADM-001', name: 'Hospital Admin', avatar: 'A' };
    }

    dispatch({ type: 'LOGIN', payload: { ...userToLogin, role } });

    if (role === 'patient') {
      navigate('/consent');
    } else {
      navigate(`/${role}`);
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const newPatientData = {
      name: formData.name || 'New Patient',
      age: formData.age || 30,
      gender: formData.gender || 'Not Specified',
      language: state.language,
      avatar: formData.name ? formData.name.charAt(0).toUpperCase() : 'N',
    };
    dispatch({ type: 'ADD_PATIENT', payload: newPatientData });
    navigate('/consent');
  };

  // --- Registration form (patient only) ---
  if (role === 'patient' && isRegistering) {
    return (
      <div className="login-page">
        <div className="login-container">
          <Link to="/" className="login-back-link">
            <ArrowLeft size={18} /> {t('back_to_roles')}
          </Link>

          <h1 className="login-heading">{t('reg_title')}</h1>

          <div className="login-card">
            <form onSubmit={handleRegister} className="login-form">
              <div className="input-group">
                <label className="input-label">{t('reg_full_name')}</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Rahul Sharma"
                  required
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="login-form-row">
                <div className="input-group">
                  <label className="input-label">{t('reg_age')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Yrs"
                    required
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{t('reg_gender')}</label>
                  <select
                    className="input"
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Male">{t('reg_male')}</option>
                    <option value="Female">{t('reg_female')}</option>
                    <option value="Other">{t('reg_other')}</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{t('reg_mobile')}</label>
                <input type="tel" className="input" placeholder="+91" required />
              </div>

              <div className="login-info-box">
                <Check size={16} />
                <span>{t('reg_id_note')}</span>
              </div>

              <div className="login-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRegistering(false)}
                >
                  {t('reg_back')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('reg_submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- Main login form ---
  const isVerified = verifyState === 'verified';
  const isVerifying = verifyState === 'verifying';
  const canProceed = isVerified && field2.trim().length > 0;

  return (
    <div className="login-page">
      <div className="login-container">
        <Link to="/" className="login-back-link">
          <ArrowLeft size={18} /> {t('back_to_roles')}
        </Link>

        <h1 className="login-heading">{config.title}</h1>

        <div className="login-card">
          <form onSubmit={handleNext} className="login-form">
            {/* Field 1 — ID */}
            <div className="input-group">
              <label className="input-label">{config.field1Label}</label>
              <div className="login-field-wrap">
                <input
                  type="text"
                  className={`input ${isVerified ? 'input-verified' : ''}`}
                  placeholder={config.field1Placeholder}
                  defaultValue={config.field1Default}
                  onChange={(e) => {
                    setField1(e.target.value);
                    if (verifyState !== 'idle') setVerifyState('idle');
                  }}
                  disabled={isVerified}
                  style={isVerified ? {
                    borderColor: 'var(--color-success-500)',
                    background: 'var(--color-success-50)',
                  } : {}}
                />
                {isVerified && (
                  <span className="login-verified-badge">
                    <Check size={14} /> {t('login_verified')}
                  </span>
                )}
              </div>
            </div>

            {/* Field 2 — OTP / Password */}
            <div className="input-group">
              <label className="input-label">{config.field2Label}</label>
              <input
                type={config.field2Type}
                className="input"
                placeholder={config.field2Placeholder}
                value={field2}
                onChange={(e) => setField2(e.target.value)}
                disabled={!isVerified}
                defaultValue={role !== 'patient' ? 'password123' : ''}
                style={!isVerified ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              />
            </div>

            {/* Actions row — Verify left, Next right */}
            <div className="login-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleVerify}
                disabled={isVerified || isVerifying || !field1.trim()}
              >
                {isVerifying ? t('login_verifying') : isVerified ? t('login_verified') : t('login_verify')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canProceed}
              >
                {t('login_next')}
              </button>
            </div>

            {/* New patient registration link (patient only) */}
            {role === 'patient' && (
              <button
                type="button"
                className="login-register-link"
                onClick={() => setIsRegistering(true)}
              >
                {t('new_patient')}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
