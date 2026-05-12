export function Button({ children, onClick, variant = "default", className = "", ...props }) {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors cursor-pointer px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:ring-offset-2 focus:ring-offset-[var(--page-bg)]";
  
  const variants = {
    default: "btn-primary",
    outline: "btn-outline",
    ghost: "btn-ghost",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
