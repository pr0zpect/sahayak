import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Clock, AlertTriangle, UserPlus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';

const AdminDashboard = () => {
  const { state } = useAppContext();
  const t = useTranslation(state.language);
  
  const analytics = state.analytics;
  const recentAlerts = state.alerts.filter(a => a.status === 'active').slice(0, 3);
  
  return (
    <div className="flex flex-col gap-8">
      <div className="page-header mb-0">
        <h1 className="page-title">{t('hospital_overview')}</h1>
        <p className="page-subtitle">{t('realtime_metrics')}</p>
      </div>

      <div className="grid grid-4 gap-6">
        <div className="stat-card border-l-4 border-l-primary-500" style={{ borderLeftColor: 'var(--color-primary-500)' }}>
          <div className="stat-card-icon bg-primary-100 text-primary-600" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-card-value">{analytics.totalIntakesToday}</div>
            <div className="stat-card-label">{t('total_intakes')}</div>
          </div>
        </div>
        
        <div className="stat-card border-l-4 border-l-success-500" style={{ borderLeftColor: 'var(--color-success-500)' }}>
          <div className="stat-card-icon bg-success-100 text-success-600" style={{ background: 'var(--color-success-100)', color: 'var(--color-success-600)' }}>
            <UserPlus size={24} />
          </div>
          <div>
            <div className="stat-card-value">{analytics.newRegistrations}</div>
            <div className="stat-card-label">{t('new_registrations')}</div>
          </div>
        </div>
        
        <div className="stat-card border-l-4 border-l-accent-500" style={{ borderLeftColor: 'var(--color-accent-500)' }}>
          <div className="stat-card-icon bg-accent-100 text-accent-600" style={{ background: 'var(--color-accent-100)', color: 'var(--color-accent-600)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-card-value">{analytics.averageWaitTime}</div>
            <div className="stat-card-label">{t('avg_wait_time')}</div>
          </div>
        </div>
        
        <div className="stat-card border-l-4 border-l-danger-500" style={{ borderLeftColor: 'var(--color-danger-500)' }}>
          <div className="stat-card-icon bg-danger-100 text-danger-600" style={{ background: 'var(--color-danger-100)', color: 'var(--color-danger-600)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-card-value">{analytics.redFlagsToday}</div>
            <div className="stat-card-label">{t('red_flags_today')}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-3 gap-8">
        <div className="card grid-span-2">
          <h2 className="heading-4 mb-6">{t('patient_inflow')}</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.intakeTrend}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#ede9fe" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="heading-4 mb-4 pb-2 border-b" style={{ borderBottom: '1px solid var(--color-neutral-200)' }}>{t('recent_red_flags')}</h2>
          <div className="space-y-4">
            {recentAlerts.map(alert => (
              <div key={alert.id} className="p-3 bg-danger-50 rounded-lg border border-danger-100" style={{ background: 'var(--color-danger-50)', borderColor: 'var(--color-danger-100)' }}>
                <div className="font-bold text-danger-800 mb-1" style={{ color: 'var(--color-danger-800)' }}>{alert.patientName}</div>
                <div className="text-sm text-danger-700" style={{ color: 'var(--color-danger-700)' }}>{alert.message}</div>
                <div className="text-xs text-danger-500 mt-2" style={{ color: 'var(--color-danger-500)' }}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {recentAlerts.length === 0 && <div className="text-muted text-sm text-center">{t('no_active_flags')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
