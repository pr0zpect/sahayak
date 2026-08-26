import React from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const AdminAlerts = () => {
  const { state, dispatch } = useAppContext();

  const activeAlerts = state.alerts.filter(a => a.status === 'active');
  const resolvedAlerts = state.alerts.filter(a => a.status !== 'active');

  const handleResolve = (id) => {
    dispatch({ type: 'MARK_ALERT_READ', payload: id });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">System Alerts</h1>
        <p className="page-subtitle">Red flags, triage alerts, and system notifications.</p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="heading-4 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse" style={{ background: 'var(--color-danger-500)' }}></span>
            Active Alerts ({activeAlerts.length})
          </h2>
          
          <div className="space-y-4">
            {activeAlerts.length === 0 ? (
              <div className="card text-center p-8 text-muted">All clear. No active alerts.</div>
            ) : (
              activeAlerts.map(alert => (
                <div key={alert.id} className="card p-4 border-l-4 border-l-danger-500 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center" style={{ borderLeftColor: 'var(--color-danger-500)' }}>
                  <div className="flex gap-4">
                    <div className="mt-1">
                      {alert.type === 'red-flag' ? <AlertTriangle className="text-danger-500" style={{ color: 'var(--color-danger-500)' }} /> : <Clock className="text-warning-500" style={{ color: 'var(--color-warning-500)' }} />}
                    </div>
                    <div>
                      <div className="font-bold text-lg">{alert.patientName}</div>
                      <div className="font-medium text-danger-700 my-1" style={{ color: 'var(--color-danger-700)' }}>{alert.message}</div>
                      <div className="text-xs text-neutral-500" style={{ color: 'var(--color-neutral-500)' }}>
                        Triggered at {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm whitespace-nowrap w-full sm:w-auto" onClick={() => handleResolve(alert.id)}>
                    <CheckCircle size={16} /> Mark Resolved
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="heading-4 mb-4 text-neutral-500" style={{ color: 'var(--color-neutral-500)' }}>Recently Resolved</h2>
          <div className="space-y-3 opacity-70">
            {resolvedAlerts.map(alert => (
              <div key={alert.id} className="bg-white border rounded-lg p-3 flex justify-between items-center" style={{ borderColor: 'var(--color-neutral-200)' }}>
                <div>
                  <div className="font-bold text-sm">{alert.patientName}</div>
                  <div className="text-xs text-neutral-600 line-clamp-1" style={{ color: 'var(--color-neutral-600)' }}>{alert.message}</div>
                </div>
                <div className="text-xs text-success-600 font-bold flex items-center gap-1" style={{ color: 'var(--color-success-600)' }}>
                  <CheckCircle size={12} /> Resolved
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminAlerts;
