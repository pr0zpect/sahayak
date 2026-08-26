import React from 'react';
import { Settings, Leaf, Moon, Database } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from '../../data/i18n';

const AdminSettings = () => {
  const { state, dispatch } = useAppContext();
  const t = useTranslation(state.language);

  const toggleAyush = () => {
    dispatch({ type: 'TOGGLE_AYUSH_MODE' });
  };

  const toggleHighContrast = () => {
    dispatch({ type: 'TOGGLE_HIGH_CONTRAST' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">{t('settings')}</h1>
        <p className="page-subtitle">{t('settings_desc')}</p>
      </div>

      <div className="grid gap-6">
        <div className="card">
          <h2 className="heading-4 mb-6 pb-2 border-b" style={{ borderBottom: '1px solid var(--color-neutral-200)' }}>{t('settings')}</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                  <Leaf size={20} />
                </div>
                <div>
                  <div className="font-bold text-lg">{t('ayush_integration')}</div>
                  <div className="text-sm text-neutral-500 max-w-md" style={{ color: 'var(--color-neutral-500)' }}>
                    Enable Ayurveda, Yoga, Unani, Siddha, and Homeopathy screening questions in the intake flow.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={state.ayushMode} onChange={toggleAyush} />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success-500" style={{ background: state.ayushMode ? 'var(--color-success-500)' : 'var(--color-neutral-200)' }}></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Moon size={20} />
                </div>
                <div>
                  <div className="font-bold text-lg">{t('high_contrast_desc')}</div>
                  <div className="text-sm text-neutral-500 max-w-md" style={{ color: 'var(--color-neutral-500)' }}>
                    Force high contrast UI for visually impaired patients across all kiosk terminals.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={state.highContrast} onChange={toggleHighContrast} />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-00" style={{ background: state.highContrast ? 'var(--color-primary-500)' : 'var(--color-neutral-200)' }}></div>
              </label>
            </div>
          </div>
        </div>

        <div className="card opacity-60 pointer-events-none">
          <h2 className="heading-4 mb-6 pb-2 border-b flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-neutral-200)' }}><Database size={20}/> Integrations</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b pb-2" style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
              <span className="font-medium">ABDM Sandbox (M3)</span>
              <span className="badge badge-success">Connected</span>
            </div>
            <div className="flex justify-between border-b pb-2" style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
              <span className="font-medium">Hospital HIS (HL7)</span>
              <span className="badge badge-warning">Simulated</span>
            </div>
            <div className="flex justify-between border-b pb-2" style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
              <span className="font-medium">Speech-to-Text Engine</span>
              <span className="badge badge-success">Online</span>
            </div>
          </div>
          <p className="text-xs text-center mt-4 text-neutral-400" style={{ color: 'var(--color-neutral-400)' }}>Integrations are locked in demo mode.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
