const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const startInterview = async (patientName, language, abhaId = null) => {
  const res = await fetch(`${BASE_URL}/interview/start/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_name: patientName,
      language: language,
      abha_id: abhaId || null,
    }),
  });
  if (!res.ok) throw new Error('Failed to start interview');
  return res.json();
};

export const respondInterview = async (sessionId, answer, inputMode = 'touch') => {
  const res = await fetch(`${BASE_URL}/interview/respond/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      answer: answer,
      input_mode: inputMode,
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

export const pushMockAbdm = async (sessionId) => {
  const res = await fetch(`${BASE_URL}/mock-abdm/push/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error('Failed to push to ABDM');
  return res.json();
};
