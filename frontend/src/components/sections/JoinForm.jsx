import { useState } from "react";

const TYPES = ["Library", "School", "Community center", "Fire station", "Place of worship", "Other"];
const GETS = [
  "An estimate of how much backup power the building would need",
  "Help finding grant money for a generator",
  "A place on the GridAid map as a community partner",
  "A window sign so neighbors know where to go",
];
const OTHER = ["Volunteer at a site", "Check buildings in your county", "Bring GridAid to your county", "Help build it (open source)"];

function Choice({ name, options, value, onChange }) {
  return (
    <div className="jf-choice" role="radiogroup">
      {options.map((o) => (
        <label key={o} className={value === o ? "on" : ""}>
          <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}

// A scaffold: it checks the form and says so, but nothing is sent anywhere yet.
export default function JoinForm() {
  const [f, setF] = useState({ gen: "", access: "" });
  const [state, setState] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));

  const submit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    setState("done");
  };

  return (
    <article className="join card rv">
      <div className="join-pitch">
        <p className="join-kick">Most needed</p>
        <h3 className="join-h">Offer a building as a backup-power site</h3>
        <p className="join-lead">When the power is out for days, neighbors who need electricity to stay healthy need somewhere to go. A library, school, community center, or fire station can be that place.</p>
        <h4>What you get</h4>
        <ul className="join-gets">{GETS.map((g) => <li key={g}>{g}</li>)}</ul>
        <h4>What it involves</h4>
        <p>Offering is free. We pass the building to your county's emergency team; they contact you, and you decide whether to take part. Sites open only during long outages.</p>
        <h4>Other ways to help</h4>
        <ul className="join-other">{OTHER.map((o) => <li key={o}>{o}</li>)}</ul>
      </div>

      {state === "done" ? (
        <div className="join-done" role="status">
          <p className="join-kick">Thank you</p>
          <h3 className="join-h">Your building is noted.</h3>
          <p>Sign-ups aren't connected to a county team yet, so nothing was sent. Keep this page open, or come back once counties are taking offers.</p>
          <button type="button" className="jf-submit" onClick={() => setState(null)}>Edit the details</button>
        </div>
      ) : (
        <form className="jf" onSubmit={submit} noValidate>
          <fieldset>
            <legend><span>01</span> The building</legend>
            <label className="jf-f wide"><span>Building name</span><input required name="building" placeholder="Main Street Library" autoComplete="organization" /></label>
            <label className="jf-f"><span>Type</span>
              <select required name="type" defaultValue=""><option value="" disabled>Choose one</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <label className="jf-f"><span>About how many people fit</span><input name="capacity" type="number" min="1" inputMode="numeric" placeholder="60" /></label>
            <label className="jf-f wide"><span>Address</span><input required name="address" placeholder="Street, town, ZIP" autoComplete="street-address" /></label>
          </fieldset>
          <fieldset>
            <legend><span>02</span> You</legend>
            <label className="jf-f"><span>Your name</span><input required name="name" autoComplete="name" /></label>
            <label className="jf-f"><span>Your role</span><input name="role" placeholder="Owner, director, manager" autoComplete="organization-title" /></label>
            <label className="jf-f"><span>Email</span><input required name="email" type="email" autoComplete="email" /></label>
            <label className="jf-f"><span>Phone</span><input name="phone" type="tel" autoComplete="tel" /></label>
          </fieldset>
          <fieldset>
            <legend><span>03</span> Readiness</legend>
            <div className="jf-f"><span>Backup generator already?</span><Choice name="gen" options={["Yes", "No", "Not sure"]} value={f.gen} onChange={set("gen")} /></div>
            <div className="jf-f"><span>Step-free entrance?</span><Choice name="access" options={["Yes", "No"]} value={f.access} onChange={set("access")} /></div>
          </fieldset>
          <label className="jf-ok">
            <input type="checkbox" required name="consent" />
            <span>I'm allowed to offer this building, and GridAid may share these details with my county's emergency team.</span>
          </label>
          <button type="submit" className="jf-submit">Offer this building</button>
        </form>
      )}
    </article>
  );
}
