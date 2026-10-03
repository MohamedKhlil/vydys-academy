import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="brand"><span className="brand-mark">V</span><span>Vydys <strong>Academy</strong></span></div>
          <p>Des compétences digitales utiles, accessibles et orientées pratique.</p>
        </div>
        <div>
          <strong>Plateforme</strong>
          <Link href="/formations">Formations</Link>
          <Link href="/classroom">Classroom</Link>
          <Link href="/connexion">Connexion</Link>
        </div>
        <div>
          <strong>Contact</strong>
          <p>Nouakchott, Mauritanie</p>
          <p>vydys.com</p>
        </div>
      </div>
    </footer>
  );
}
