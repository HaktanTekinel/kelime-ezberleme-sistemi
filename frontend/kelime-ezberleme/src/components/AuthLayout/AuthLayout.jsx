import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import "../../styles/auth.css";

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <Link to="/" className="auth-close-button" aria-label="Ana sayfaya dön">
        ×
      </Link>

      <section className="auth-card">
        <h1>{title}</h1>

        {subtitle && <p className="auth-subtitle">{subtitle}</p>}

        {children}

        {footer && <div className="auth-footer">{footer}</div>}
      </section>
    </main>
  );
}

AuthLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
};

AuthLayout.defaultProps = {
  subtitle: "",
  footer: null,
};

export default AuthLayout;