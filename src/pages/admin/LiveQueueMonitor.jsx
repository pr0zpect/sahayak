import React from 'react';
import { Users, Clock, User } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const LiveQueueMonitor = () => {
  const { state } = useAppContext();
  
  // Group by doctor
  const queueByDoctor = state.queue.reduce((acc, curr) => {
    if (!acc[curr.doctorName]) acc[curr.doctorName] = { waiting: [], inConsult: [] };
    if (curr.status === 'waiting') acc[curr.doctorName].waiting.push(curr);
    if (curr.status === 'in-consultation') acc[curr.doctorName].inConsult.push(curr);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Live Queue Monitor</h1>
        <p className="page-subtitle">Real-time status of all OPD chambers.</p>
      </div>

      <div className="grid gap-8">
        {Object.entries(queueByDoctor).map(([doctorName, queues]) => (
          <div key={doctorName} className="card p-0 overflow-hidden shadow-md">
            <div className="bg-neutral-800 text-white p-4 flex justify-between items-center" style={{ background: 'var(--color-neutral-800)' }}>
              <h2 className="heading-4 m-0 flex items-center gap-2"><User size={20} /> {doctorName}</h2>
              <div className="flex gap-4 text-sm">
                <span>Waiting: <strong className="text-warning-300" style={{ color: 'var(--color-warning-300)' }}>{queues.waiting.length}</strong></span>
                <span>In Consult: <strong className="text-success-300" style={{ color: 'var(--color-success-300)' }}>{queues.inConsult.length}</strong></span>
              </div>
            </div>
            
            <div className="p-4 grid grid-2 gap-4 bg-neutral-50" style={{ background: 'var(--color-neutral-50)' }}>
              <div>
                <h3 className="font-bold text-sm uppercase text-neutral-500 mb-3" style={{ color: 'var(--color-neutral-500)' }}>Currently Consulting</h3>
                {queues.inConsult.length === 0 ? (
                  <div className="text-muted text-sm italic">Doctor is free.</div>
                ) : (
                  queues.inConsult.map(p => (
                    <div key={p.id} className="bg-white border-2 border-success-400 rounded-lg p-3 flex justify-between items-center shadow-sm" style={{ borderColor: 'var(--color-success-400)' }}>
                      <div>
                        <div className="font-bold text-success-800" style={{ color: 'var(--color-success-800)' }}>{p.patientName}</div>
                        <div className="text-xs text-neutral-600 mt-1" style={{ color: 'var(--color-neutral-600)' }}>Token: {p.tokenNumber}</div>
                      </div>
                      <div className="badge badge-success animate-pulse">In Progress</div>
                    </div>
                  ))
                )}
              </div>
              
              <div>
                <h3 className="font-bold text-sm uppercase text-neutral-500 mb-3" style={{ color: 'var(--color-neutral-500)' }}>Next in Line</h3>
                <div className="space-y-2">
                  {queues.waiting.slice(0, 3).map((p, idx) => (
                    <div key={p.id} className={`bg-white border rounded-lg p-3 flex justify-between items-center ${p.redFlag ? 'border-danger-300 bg-danger-50' : ''}`} style={p.redFlag ? { borderColor: 'var(--color-danger-300)', background: 'var(--color-danger-50)' } : { borderColor: 'var(--color-neutral-200)' }}>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-neutral-300 w-6 text-center" style={{ color: 'var(--color-neutral-300)' }}>#{idx + 1}</div>
                        <div>
                          <div className="font-bold">{p.patientName}</div>
                          <div className="text-xs text-neutral-500" style={{ color: 'var(--color-neutral-500)' }}>Waiting {p.waitTime} mins</div>
                        </div>
                      </div>
                      <div className="badge badge-neutral">{p.tokenNumber}</div>
                    </div>
                  ))}
                  {queues.waiting.length > 3 && (
                    <div className="text-center text-xs text-primary-600 font-bold mt-2 cursor-pointer" style={{ color: 'var(--color-primary-600)' }}>
                      + {queues.waiting.length - 3} more waiting
                    </div>
                  )}
                  {queues.waiting.length === 0 && (
                    <div className="text-muted text-sm italic">Queue is empty.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveQueueMonitor;
