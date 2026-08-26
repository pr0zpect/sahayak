import React from 'react';
import { LANGUAGES } from '../data/mockData';
import { useAppContext } from '../context/AppContext';

const LanguageSelector = ({ compact = false }) => {
  const { state, dispatch } = useAppContext();

  return (
    <div className={`flex ${compact ? 'flex-wrap gap-2' : 'gap-3'} justify-center w-full`}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          className={`chip ${compact ? 'chip-sm' : ''} ${state.language === lang.code ? 'selected' : ''}`}
          onClick={() => dispatch({ type: 'SET_LANGUAGE', payload: lang.code })}
          style={{ minHeight: compact ? '40px' : '52px', minWidth: compact ? 'auto' : '100px', flex: compact ? '1' : 'none', padding: compact ? '8px' : '' }}
        >
          {compact ? lang.native : `${lang.native} - ${lang.label}`}
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
