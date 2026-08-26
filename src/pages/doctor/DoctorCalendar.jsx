import React from 'react';

const DoctorCalendar = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">My Schedule</h1>
        <p className="page-subtitle">Weekly view of OPD shifts, surgeries, and meetings.</p>
      </div>

      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h2 className="heading-3 mb-2">Schedule View</h2>
        <p className="text-muted max-w-md mx-auto">This module connects to the hospital's HR and scheduling system to show your shifts. Not fully implemented in this demo build.</p>
      </div>
    </div>
  );
};

export default DoctorCalendar;
