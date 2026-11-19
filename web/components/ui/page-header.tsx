/** Ink page header: display head over one lead line, ink rule below. */

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="page-header">
      <div className="container">
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
    </section>
  );
}
