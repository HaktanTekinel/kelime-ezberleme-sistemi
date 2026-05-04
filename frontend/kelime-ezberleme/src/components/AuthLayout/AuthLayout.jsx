import AuthCloseButton from "../AuthCloseButton/AuthCloseButton";
import "../../styles/auth.css";

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <AuthCloseButton />

      <section className="auth-card">
        <h1>{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}

        {children}

        {footer && <div className="auth-footer">{footer}</div>}
      </section>
    </main>
  );
}

export default AuthLayout;