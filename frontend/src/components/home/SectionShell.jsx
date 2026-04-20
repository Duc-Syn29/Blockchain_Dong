export function SectionShell({ eyebrow, title, description, action, className = "", id, children }) {
  const sectionClassName = ["landing-section", className].filter(Boolean).join(" ");

  return (
    <section className={sectionClassName} id={id}>
      <div className="landing-section-header">
        <div className="landing-section-copy">
          {eyebrow ? <span className="landing-section-eyebrow">{eyebrow}</span> : null}
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="landing-section-action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
