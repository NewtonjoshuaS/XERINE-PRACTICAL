export default function Alert({ type, message, onClose }) {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`} role={type === "error" ? "alert" : "status"}>
      <span>{message}</span>
      <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
