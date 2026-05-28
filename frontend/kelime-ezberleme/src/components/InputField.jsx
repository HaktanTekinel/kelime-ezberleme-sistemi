import PropTypes from "prop-types";

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

InputField.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
};

InputField.defaultProps = {
  type: "text",
  placeholder: "",
  error: "",
};

export default InputField;