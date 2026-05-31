export const isValidEmail = (email) => {
  if (!email) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const isValidPassword = (password) => {
  return typeof password === "string" && password.length >= 6;
};

export const isValidUsername = (username) => {
  return typeof username === "string" && username.trim().length >= 3;
};

export const validateLoginForm = (formData) => {
  const errors = {};

  if (!formData.username_or_email?.trim()) {
    errors.username_or_email = "Kullanıcı adı veya e-posta boş bırakılamaz.";
  }

  if (!formData.password) {
    errors.password = "Şifre boş bırakılamaz.";
  } else if (!isValidPassword(formData.password)) {
    errors.password = "Şifre en az 6 karakter olmalıdır.";
  }

  return errors;
};

export const validateRegisterForm = (formData) => {
  const errors = {};

  if (!formData.username?.trim()) {
    errors.username = "Kullanıcı adı boş bırakılamaz.";
  } else if (!isValidUsername(formData.username)) {
    errors.username = "Kullanıcı adı en az 3 karakter olmalıdır.";
  }

  if (!formData.email?.trim()) {
    errors.email = "E-posta adresi boş bırakılamaz.";
  } else if (!isValidEmail(formData.email)) {
    errors.email = "Geçerli bir e-posta adresi giriniz.";
  }

  if (!formData.password) {
    errors.password = "Şifre boş bırakılamaz.";
  } else if (!isValidPassword(formData.password)) {
    errors.password = "Şifre en az 6 karakter olmalıdır.";
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = "Şifre tekrar alanı boş bırakılamaz.";
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Şifreler eşleşmiyor.";
  }

  return errors;
};

export const validateForgotPasswordEmail = (email) => {
  if (!email?.trim()) {
    return "E-posta adresi boş bırakılamaz.";
  }

  if (!isValidEmail(email)) {
    return "Geçerli bir e-posta adresi giriniz.";
  }

  return "";
};

export const validateResetPasswordForm = (formData) => {
  const errors = {};

  if (!formData.resetToken?.trim()) {
    errors.resetToken = "Sıfırlama kodu boş bırakılamaz.";
  }

  if (!formData.newPassword) {
    errors.newPassword = "Yeni şifre boş bırakılamaz.";
  } else if (!isValidPassword(formData.newPassword)) {
    errors.newPassword = "Yeni şifre en az 6 karakter olmalıdır.";
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = "Yeni şifre tekrar alanı boş bırakılamaz.";
  } else if (formData.newPassword !== formData.confirmPassword) {
    errors.confirmPassword = "Şifreler eşleşmiyor.";
  }

  return errors;
};