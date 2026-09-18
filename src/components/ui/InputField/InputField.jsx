import './InputField.css'

function InputField({ label, type = 'text', name, value, placeholder, onChange, ...props }) {
  return (
    <label className="input-field">
      {label && <span className="input-field__label">{label}</span>}
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        {...props}
      />
    </label>
  )
}

export default InputField
