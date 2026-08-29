const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const startInterview = async (patientName, language, mode = 'allopathic', abhaId = null, abhaNumber = null) => {
  const res = await fetch(`${BASE_URL}/interview/start/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_name: patientName,
      language: language,
      mode: mode,
      abha_id: abhaId || null,
      abha_number: abhaNumber || null,
    }),
  });
  if (!res.ok) throw new Error('Failed to start interview');
  return res.json();
};

export const respondInterview = async (sessionId, answer, inputMode = 'touch', language = 'en') => {
  const res = await fetch(`${BASE_URL}/interview/respond/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      answer: answer,
      input_mode: inputMode,
      language: language,
    }),
  });
  if (!res.ok) throw new Error('Failed to submit response');
  return res.json();
};

export const uploadDocument = async (sessionId, imageFile) => {
  const formData = new FormData();
  formData.append('session_id', sessionId);
  formData.append('image', imageFile);

  const res = await fetch(`${BASE_URL}/documents/upload/`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Document upload failed');
  return res.json();
};

export const generateSummary = async (sessionId) => {
  const res = await fetch(`${BASE_URL}/summary/generate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error('Failed to generate summary');
  return res.json();
};

export const grantConsent = async (sessionId, scope) => {
  const res = await fetch(`${BASE_URL}/consent/grant/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, scope }),
  });
  if (!res.ok) throw new Error('Failed to record consent');
  return res.json();
};

export const revokeConsent = async (consentId) => {
  const res = await fetch(`${BASE_URL}/consent/revoke/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent_id: consentId }),
  });
  if (!res.ok) throw new Error('Failed to revoke consent');
  return res.json();
};

export const authenticateAbdm = async (abhaNumber) => {
  const res = await fetch(`${BASE_URL}/abdm/authenticate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ abha_number: abhaNumber }),
  });
  if (!res.ok) throw new Error('ABDM Authentication failed');
  return res.json();
};

export const pushAbdm = async (sessionId) => {
  const res = await fetch(`${BASE_URL}/abdm/push/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error('ABDM FHIR push failed');
  return res.json();
};

export const loginDoctor = async (username, password) => {
  const res = await fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Login failed. Check credentials.');
  }
  return res.json();
};

export const getSummaryDetail = async (sessionId, token) => {
  const res = await fetch(`${BASE_URL}/summary/${sessionId}/`, {
    headers: {
      'Authorization': `Token ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch summary (status ${res.status})`);
  return res.json();
};

export const patchSummaryDetail = async (sessionId, token, structuredJson, doctorNotes) => {
  const res = await fetch(`${BASE_URL}/summary/${sessionId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${token}`,
    },
    body: JSON.stringify({
      structured_json: structuredJson,
      doctor_notes: doctorNotes,
    }),
  });
  if (!res.ok) throw new Error('Failed to update summary');
  return res.json();
};

export const getAdminQueue = async (token, status = '') => {
  const url = status ? `${BASE_URL}/admin/queue/?status=${status}` : `${BASE_URL}/admin/queue/`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Token ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch admin queue');
  return res.json();
};

export const getAdminAlerts = async (token) => {
  const res = await fetch(`${BASE_URL}/admin/alerts/`, {
    headers: { 'Authorization': `Token ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch admin alerts');
  return res.json();
};

export const getAdminAnalytics = async (token) => {
  const res = await fetch(`${BASE_URL}/admin/analytics/`, {
    headers: { 'Authorization': `Token ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch admin analytics');
  return res.json();
};

export const generateToken = async (sessionId) => {
  const res = await fetch(`${BASE_URL}/token/generate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error('Token generation failed');
  return res.json();
};

