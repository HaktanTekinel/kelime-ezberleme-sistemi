import { Link } from "react-router-dom";

function AuthCloseButton() {
  return (
    <Link to="/" className="auth-close-button" aria-label="Ana sayfaya dön">
      ×
    </Link>
  );
}

export default AuthCloseButton;