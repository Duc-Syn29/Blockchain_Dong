import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthForm } from "../components/forms/AuthForm";
import { useAuth } from "../hooks/useAuth";
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
} from "../utils/authValidation";

const initialValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");

  const validateField = (name, nextValues) => {
    if (name === "name") {
      return validateName(nextValues.name);
    }

    if (name === "email") {
      return validateEmail(nextValues.email);
    }

    if (name === "password") {
      return validatePassword(nextValues.password);
    }

    if (name === "confirmPassword") {
      return validateConfirmPassword(
        nextValues.confirmPassword,
        nextValues.password,
      );
    }

    return "";
  };

  const validate = () => {
    const nextErrors = {};
    const nameError = validateField("name", values);
    const emailError = validateField("email", values);
    const passwordError = validateField("password", values);
    const confirmPasswordError = validateField("confirmPassword", values);

    if (nameError) {
      nextErrors.name = nameError;
    }

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (passwordError) {
      nextErrors.password = passwordError;
    }

    if (confirmPasswordError) {
      nextErrors.confirmPassword = confirmPasswordError;
    }

    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValues = { ...values, [name]: value };

    setValues(nextValues);
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => {
      const nextErrors = {
        ...current,
        [name]: validateField(name, nextValues),
      };

      if (name === "password" && touched.confirmPassword) {
        nextErrors.confirmPassword = validateField("confirmPassword", nextValues);
      }

      return nextErrors;
    });
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
        name: true,
        email: true,
        password: true,
        confirmPassword: true,
      });
      setErrors(nextErrors);
      return;
    }

    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      navigate("/login", {
        replace: true,
        state: { message: "Registration successful. Please login." },
      });
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <>
      <AuthForm
        title="Đăng ký"
        subtitle="Tạo tài khoản mới"
        fields={[
          {
            name: "name",
            label: "Tên người dùng",
            type: "text",
            placeholder: "Nhập tên người dùng của bạn",
          },
          {
            name: "email",
            label: "Email",
            type: "email",
            placeholder: "Nhập email của bạn",
          },
          {
            name: "password",
            label: "Mật Khẩu",
            type: "password",
            placeholder: "Nhập mật khẩu của bạn",
          },
          {
            name: "confirmPassword",
            label: "Xác nhận mật khẩu",
            type: "password",
            placeholder: "Xác nhận mật khẩu",
          },
        ]}
        values={values}
        errors={errors}
        onChange={handleChange}
        onBlur={handleBlur}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
        submitLabel="Đăng ký"
        footer={
          <p>
            Đã có tài khoản? <Link to="/login">Đăng nhập tại đây</Link>
          </p>
        }
      />
      {serverError ? <p className="server-error">{serverError}</p> : null}
    </>
  );
}
