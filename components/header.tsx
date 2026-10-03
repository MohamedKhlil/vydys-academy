import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link className="brand" href="/">
          <span className="brand-mark">V</span>
          <span>Vydys <strong>Academy</strong></span>
        </Link>
        <nav className="main-nav" aria-label="Navigation principale">
          <Link href="/formations">Formations</Link>
          <Link href="/classroom">Classroom</Link>
          <Link href="/dashboard">Mon espace</Link>
        </nav>
        <Link className="btn btn-small" href="/connexion">Se connecter</Link>
      </div>
    </header>
  );
}
