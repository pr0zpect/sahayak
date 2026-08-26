import React, { useState } from 'react';
import { Search, User, Stethoscope } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const DoctorDirectory = () => {
  const { state } = useAppContext();
  const [query, setQuery] = useState('');

  const filtered = state.doctors.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Doctor Directory</h1>
          <p className="page-subtitle">Manage hospital staff and departments.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-400" />
          </div>
          <input 
            type="text" 
            className="input pl-10" 
            placeholder="Search doctors..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-3 gap-6">
        {filtered.map(doctor => (
          <div key={doctor.id} className="card flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className="w-16 h-16 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-xl flex-shrink-0" style={{ background: 'var(--color-accent-100)', color: 'var(--color-accent-700)' }}>
              {doctor.avatar || <Stethoscope size={28} />}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight mb-1">{doctor.name}</h3>
              <div className="text-sm font-medium text-accent-600 mb-2" style={{ color: 'var(--color-accent-600)' }}>{doctor.department}</div>
              <div className="text-xs text-neutral-500 mb-1" style={{ color: 'var(--color-neutral-500)' }}>ID: {doctor.id}</div>
              <div className="flex gap-2 mt-3">
                <button className="btn btn-secondary btn-sm flex-1 text-xs">Schedule</button>
                <button className="btn btn-ghost btn-sm flex-1 text-xs border border-neutral-200" style={{ borderColor: 'var(--color-neutral-200)' }}>Profile</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-8 text-center text-muted card">No doctors found.</div>
        )}
      </div>
    </div>
  );
};

export default DoctorDirectory;
