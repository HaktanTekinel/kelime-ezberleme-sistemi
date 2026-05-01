const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => {
  return EMAIL_PATTERN.test(email);
};

export const validateLoginForm = ({ userName, password }) => {
  const errors = {};

  if (!userName.trim()) {
    errors.userName = "Kullanıcı adı gerekli.";
  }

  if (!password) {
    errors.password = "Şifre gerekli.";
  }

  return errors;
};

export const validateRegisterForm = ({
  username,
  email,
  password,
  confirmPassword,
}) => {
  const errors = {};

  if (!username.trim()) {
    errors.username = "Kullanıcı adı boş bırakılamaz.";
  } else if (username.trim().length < 3) {
    errors.username = "Kullanıcı adı en az 3 karakter olmalıdır.";
  }

  if (!email.trim()) {
    errors.email = "E-posta boş bırakılamaz.";
  } else if (!isValidEmail(email)) {
    errors.email = "Geçerli bir e-posta adresi giriniz.";
  }

  if (!password) {
    errors.password = "Şifre boş bırakılamaz.";
  } else if (password.length < 6) {
    errors.password = "Şifre en az 6 karakter olmalıdır.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Şifre tekrar alanı boş bırakılamaz.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Şifreler eşleşmiyor.";
  }

  return errors;
};

export const validateForgotPasswordForm = (email) => {
  const errors = {};

  if (!email.trim()) {
    errors.email = "E-posta boş bırakılamaz.";
  } else if (!isValidEmail(email)) {
    errors.email = "Geçerli bir e-posta adresi giriniz.";
  }

  return errors;
};