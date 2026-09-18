import './Button.css'

function Button({ children, type = 'button', variant = 'primary', className = '', ...props }) {
  return (
    <button
      type={type}
      className={`button button--${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
