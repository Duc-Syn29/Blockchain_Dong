import { useState } from "react";

export function AuthForm({
  title,
  subtitle,
  fields,
  values,
  errors,
  onChange,
  onBlur,
  onSubmit,
  isSubmitting,
  submitLabel,
  footer,
}) {
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const togglePasswordVisibility = (fieldName) => {
    setVisiblePasswords((current) => ({
      ...current,
      [fieldName]: !current[fieldName],
    }));
  };

  return (
    <section className="auth-card">
      <div className="auth-copy">
        <p className="eyebrow">{subtitle}</p>
        <h1>{title}</h1>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        {fields.map((field) => {
          const isPasswordField = field.type === "password";
          const inputType =
            isPasswordField && visiblePasswords[field.name] ? "text" : field.type;
          const isSelectField = field.type === "select";

          return (
            <label className="form-field" key={field.name}>
              <span>{field.label}</span>
              {isSelectField ? (
                <select
                  className="form-select"
                  name={field.name}
                  value={values[field.name] || ""}
                  onChange={onChange}
                  onBlur={onBlur}
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="input-with-action">
                  <input
                    name={field.name}
                    type={inputType}
                    value={values[field.name] || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={field.placeholder}
                  />
                  {isPasswordField ? (
                    <button
                      className="input-action"
                      type="button"
                      onClick={() => togglePasswordVisibility(field.name)}
                    >
                      {visiblePasswords[field.name] ? "Hide" : "Show"}
                    </button>
                  ) : null}
                </div>
              )}
              {errors[field.name] ? (
                <small className="field-error">{errors[field.name]}</small>
              ) : null}
            </label>
          );
        })}

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Please wait..." : submitLabel}
        </button>
      </form>

      {footer ? <div className="auth-footer">{footer}</div> : null}
    </section>
  );
}
