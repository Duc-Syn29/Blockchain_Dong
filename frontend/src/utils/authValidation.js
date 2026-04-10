const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{};:'"\\|,.<>/?`~]).{9,}$/;

export function validateName(name) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    return "Tên người dùng không được để trống";
  }

  if (normalizedName.length <= 6) {
    return "Tên người dùng phải trên 6 ký tự";
  }

  return "";
}

export function validateEmail(email) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return "Email không được để trống";
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return "Email không đúng định dạng";
  }

  return "";
}

export function validatePassword(password) {
  if (!password.trim()) {
    return "Mật khẩu không được để trống";
  }

  if (!PASSWORD_REGEX.test(password)) {
    return "Mật khẩu phải trên 8 ký tự, có chữ, số, 1 chữ hoa và 1 ký tự đặc biệt";
  }

  return "";
}

export function validateConfirmPassword(confirmPassword, password) {
  if (!confirmPassword.trim()) {
    return "Xác nhận mật khẩu không được để trống";
  }

  if (confirmPassword !== password) {
    return " Mật khẩu không khớp";
  }

  return "";
}

export function validateWalletAddress(walletAddress) {
  const normalizedWalletAddress = walletAddress.trim();

  if (!normalizedWalletAddress) {
    return "";
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedWalletAddress)) {
    return "Địa chỉ ví phải là địa chỉ ví hợp lệ";
  }

  return "";
}
