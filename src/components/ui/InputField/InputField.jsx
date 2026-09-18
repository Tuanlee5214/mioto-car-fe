import './InputField.css'

function InputField({
  label,
  type = 'text',
  name,
  value,
  placeholder,
  onChange,
  children,
  ...props
}) {
  return (
    <label className="input-field">
      {label && <span className="input-field__label">{label}</span>}

      <div className="input-field__wrapper">
        <input
          type={type}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          {...props}
        />
        {children}
      </div>
    </label>
  )
}

export default InputField
