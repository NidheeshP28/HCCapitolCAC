import Logo from "../ui/Logo.jsx";

export default function Footer() {
  return (
    <footer className="foot-sec">
      <Logo className="foot-logo" />
      <p>Aaron Qin, Hardy Wang, Anay Sura, Nidheesh Pusuluri · Capitol 2026</p>
      {/* scroll without writing #top into the hash, which holds the county (#c=...) */}
      <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↑</a>
    </footer>
  );
}
