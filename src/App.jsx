import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import ConsentScreen from './pages/ConsentScreen';

// Patient Pages
import IntakeFlow from './pages/patient/IntakeFlow';
import IntakeSummary from './pages/patient/IntakeSummary';
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientTimeline from './pages/patient/PatientTimeline';
import PatientDocuments from './pages/patient/PatientDocuments';
import PatientCalendar from './pages/patient/PatientCalendar';
import PatientProfile from './pages/patient/PatientProfile';

// Doctor Pages
import DoctorQueue from './pages/doctor/DoctorQueue';
import PatientView from './pages/doctor/PatientView';
import DoctorSearch from './pages/doctor/DoctorSearch';
import DoctorCalendar from './pages/doctor/DoctorCalendar';
import DoctorReferrals from './pages/doctor/DoctorReferrals';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import LiveQueueMonitor from './pages/admin/LiveQueueMonitor';
import PatientDirectory from './pages/admin/PatientDirectory';
import DoctorDirectory from './pages/admin/DoctorDirectory';
import AdminAlerts from './pages/admin/AdminAlerts';
import AdminSettings from './pages/admin/AdminSettings';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { state } = useAppContext();
  
  if (!state.currentUser) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(state.currentUser.role)) {
    return <Navigate to="/" replace />; // Or a generic unauthorized page
  }

  return children;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/consent" element={<ConsentScreen />} />

        {/* Patient Intake Flow (Full Screen, No Sidebar) */}
        <Route path="/patient/intake" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <IntakeFlow />
          </ProtectedRoute>
        } />
        <Route path="/patient/intake/summary" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <IntakeSummary />
          </ProtectedRoute>
        } />

        {/* Patient Dashboard Routes */}
        <Route path="/patient" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <DashboardLayout role="patient" />
          </ProtectedRoute>
        }>
          <Route index element={<PatientDashboard />} />
          <Route path="timeline" element={<PatientTimeline />} />
          <Route path="documents" element={<PatientDocuments />} />
          <Route path="appointments" element={<PatientCalendar />} />
          <Route path="profile" element={<PatientProfile />} />
        </Route>

        {/* Doctor Portal Routes */}
        <Route path="/doctor" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DashboardLayout role="doctor" />
          </ProtectedRoute>
        }>
          <Route index element={<DoctorQueue />} />
          <Route path="patient/:id" element={<PatientView />} />
          <Route path="search" element={<DoctorSearch />} />
          <Route path="calendar" element={<DoctorCalendar />} />
          <Route path="referrals" element={<DoctorReferrals />} />
        </Route>

        {/* Admin Portal Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="queue" element={<LiveQueueMonitor />} />
          <Route path="patients" element={<PatientDirectory />} />
          <Route path="doctors" element={<DoctorDirectory />} />
          <Route path="alerts" element={<AdminAlerts />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;
