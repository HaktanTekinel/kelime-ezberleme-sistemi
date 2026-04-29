function InputField({ label, type, value, onChange, placeholder, error }) {
  return (
    <div className="auth-form-group">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {error && <p className="auth-message error">{error}</p>}
    </div>
  );
}

export default InputField;