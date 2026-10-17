export default function SectionHead({ n, title, kicker }) {
  return (
    <header className="sec-head rv">
      <span className="sec-n">{n}</span>
      <h2 className="sec-t">{title}</h2>
      {kicker && <p className="sec-k">{kicker}</p>}
      <i className="sec-rule" aria-hidden="true" />
    </header>
  );
}
