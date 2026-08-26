import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  MOCK_PATIENTS,
  MOCK_DOCTORS,
  MOCK_QUEUE,
  MOCK_ALERTS,
  MOCK_APPOINTMENTS,
  MOCK_DOCUMENTS,
  MOCK_REFERRALS,
  generatePatientId
} from '../data/mockData';

// Initial state for the demo
const initialState = {
  currentUser: null, // { role: 'patient' | 'doctor' | 'admin', ...details }
  patients: MOCK_PATIENTS,
  doctors: MOCK_DOCTORS,
  queue: MOCK_QUEUE,
  alerts: MOCK_ALERTS,
  appointments: MOCK_APPOINTMENTS,
  documents: MOCK_DOCUMENTS,
  referrals: MOCK_REFERRALS,
  language: 'en', // 'en', 'hi', 'ta', 'bn'
  ayushMode: false,
  highContrast: false,
  tempIntake: null,
};

// Reducer for state management
function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'TOGGLE_AYUSH_MODE':
      return { ...state, ayushMode: !state.ayushMode };
    case 'TOGGLE_HIGH_CONTRAST':
      return { ...state, highContrast: !state.highContrast };
    
    // Patient Data Actions
    case 'ADD_PATIENT':
      const newPatient = {
        ...action.payload,
        id: action.payload.id || generatePatientId(),
        registeredDate: new Date().toISOString().split('T')[0],
        visits: 0,
        activePrescriptions: 0,
      };
      return { ...state, patients: [...state.patients, newPatient], currentUser: { role: 'patient', ...newPatient } };
    
    case 'UPDATE_INTAKE':
      // In a real app, this would save to the DB. For now, we update the queue if the patient is in it.
      return state;
      
    case 'UPDATE_INTAKE_TEMP':
      return { ...state, tempIntake: action.payload };
      
    case 'ADD_TO_QUEUE':
      return { ...state, queue: [...state.queue, action.payload] };
      
    case 'UPDATE_QUEUE_STATUS':
      return {
        ...state,
        queue: state.queue.map(q => 
          q.patientId === action.payload.patientId ? { ...q, status: action.payload.status } : q
        )
      };

    case 'TRIGGER_RED_FLAG':
      const newAlert = {
        id: `ALR-${Math.floor(Math.random() * 1000)}`,
        type: 'red-flag',
        patientId: action.payload.patientId,
        patientName: action.payload.patientName,
        message: action.payload.message,
        timestamp: new Date().toISOString(),
        status: 'active',
      };
      return { ...state, alerts: [newAlert, ...state.alerts] };
      
    case 'ADD_REFERRAL':
      const newReferral = {
        id: `REF-${Math.floor(Math.random() * 1000)}`,
        ...action.payload,
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
      };
      return { ...state, referrals: [newReferral, ...state.referrals] };

    case 'ADD_DOCUMENT':
      const newDocument = {
        id: `DOC-REP-${Math.floor(Math.random() * 1000)}`,
        ...action.payload,
        date: new Date().toISOString().split('T')[0],
        status: 'verified'
      };
      return { ...state, documents: [newDocument, ...state.documents] };

    default:
      return state;
  }
}

// Create Context
const AppContext = createContext();

// Provider Component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Effect to handle high contrast class on body
  useEffect(() => {
    if (state.highContrast) {
      document.body.setAttribute('data-contrast', 'high');
    } else {
      document.body.removeAttribute('data-contrast');
    }
  }, [state.highContrast]);

  // Effect to handle AYUSH mode class on body (for specific pages or globally)
  useEffect(() => {
    if (state.ayushMode) {
      document.body.setAttribute('data-ayush', 'true');
    } else {
      document.body.removeAttribute('data-ayush');
    }
  }, [state.ayushMode]);

  // Helper function to get patient details easily
  const getPatient = (id) => state.patients.find(p => p.id === id);
  const getDoctor = (id) => state.doctors.find(d => d.id === id);

  const value = {
    state,
    dispatch,
    getPatient,
    getDoctor
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom Hook to use the App Context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
