import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthForm } from "../components/forms/AuthForm";
import { useAuth } from "../hooks/useAuth";
import { validateEmail, validatePassword } from "../utils/authValidation";

const initialValues = {
  email: "",
  password: "",
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");

  const validateField = (name, nextValues) => {
    if (name === "email") {
      return validateEmail(nextValues.email);
    }

    if (name === "password") {
      return validatePassword(nextValues.password);
    }

    return "";
  };

  const validate = () => {
    const nextErrors = {};
    const emailError = validateField("email", values);
    const passwordError = validateField("password", values);

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (passwordError) {
      nextErrors.password = passwordError;
    }

    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValues = { ...values, [name]: value };

    setValues(nextValues);
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({
      ...current,
      [name]: validateField(name, nextValues),
    }));
    setServerError("");
  };

  const handleBlur = (event) => {
    const { name } = event.target;

    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({
      ...current,
      [name]: validateField(name, values),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setTouched({
        email: true,
        password: true,
      });
      setErrors(nextErrors);
      return;
    }

    try {
      await login({
        ...values,
        email: values.email.trim(),
      });
      const redirectTo = location.state?.from?.pathname || "/profile";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <>
      <AuthForm
        title="Đăng nhập"
        subtitle="Đăng nhập vào tài khoản của bạn"
        fields={[
          {
            name: "email",
            label: "Email",
            type: "email",
            placeholder: "Nhập email của bạn",
          },
          {
            name: "password",
            label: "Mật khẩu",
            type: "password",
            placeholder: "Nhập mật khẩu của bạn",
          },
        ]}
        values={values}
        errors={errors}
        onChange={handleChange}
        onBlur={handleBlur}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
        submitLabel="Đăng nhập"
        footer={
          <p>
            Chưa có tài khoản? <Link to="/register">Đăng ký tại đây</Link>
          </p>
        }
      />
      {serverError ? <p className="server-error">{serverError}</p> : null}
    </>
  );
}
