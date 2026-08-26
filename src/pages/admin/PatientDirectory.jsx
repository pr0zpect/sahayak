import React, { useState } from 'react';
import { Search, User } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const PatientDirectory = () => {
  const { state } = useAppContext();
  const [query, setQuery] = useState('');

  const filtered = state.patients.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Patient Directory</h1>
          <p className="page-subtitle">Manage all registered patients in the hospital.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-400" />
          </div>
          <input 
            type="text" 
            className="input pl-10" 
            placeholder="Search patients..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-sm uppercase tracking-wider border-b" style={{ background: 'var(--color-neutral-50)', color: 'var(--color-neutral-500)', borderBottom: '1px solid var(--color-neutral-200)' }}>
                <th className="p-4 font-bold">Patient</th>
                <th className="p-4 font-bold">Sahayak ID</th>
                <th className="p-4 font-bold">ABHA ID</th>
                <th className="p-4 font-bold">Age/Gender</th>
                <th className="p-4 font-bold">Registered</th>
                <th className="p-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100" style={{ borderBottomColor: 'var(--color-neutral-100)' }}>
              {filtered.map(patient => (
                <tr key={patient.id} className="hover:bg-neutral-50 transition-colors" style={{ ':hover': { background: 'var(--color-neutral-50)' } }}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
                        {patient.avatar || <User size={14} />}
                      </div>
                      <div className="font-bold">{patient.name}</div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium">{patient.id}</td>
                  <td className="p-4 text-sm text-neutral-600" style={{ color: 'var(--color-neutral-600)' }}>{patient.abhaId}</td>
                  <td className="p-4 text-sm">{patient.age} / {patient.gender}</td>
                  <td className="p-4 text-sm text-neutral-600" style={{ color: 'var(--color-neutral-600)' }}>{new Date(patient.registeredDate).toLocaleDateString()}</td>
                  <td className="p-4">
                    <button className="text-primary-600 hover:underline text-sm font-bold" style={{ color: 'var(--color-primary-600)' }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted">No patients found.</div>
        )}
      </div>
    </div>
  );
};

export default PatientDirectory;
