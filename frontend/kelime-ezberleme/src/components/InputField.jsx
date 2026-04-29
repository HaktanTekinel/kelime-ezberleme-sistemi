// src/components/InputField.jsx
import React from 'react';

const InputField = ({ label, type, value, onChange, placeholder, error }) => {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input-field"
      />
      {error && <span className="input-error">{error}</span>}
    </div>
  );
};

export default InputField;