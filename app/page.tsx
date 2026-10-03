import Link from "next/link";

const features = [
  ["Cours courts & pratiques", "Apprenez avec des vidéos ciblées, des exercices et des modèles prêts à l'emploi."],
  ["Classrooms en direct", "Participez à des sessions live, posez vos questions et travaillez avec votre promotion."],
  ["IA appliquée au marketing", "Utilisez ChatGPT et les outils d'IA pour créer du contenu, vendre et gagner du temps."],
  ["Certificat de fin", "Validez votre progression, vos quiz et votre projet final pour obtenir votre certificat."],
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">L'académie digitale pensée pour aujourd'hui</div>
            <h1>Apprenez le <span>marketing digital</span> à l'ère de l'IA.</h1>
            <p className="hero-copy">Une formation en ligne simple, pratique et accessible pour apprendre à créer du contenu, trouver des clients et lancer des campagnes avec l'intelligence artificielle.</p>
            <div className="hero-actions">
              <Link className="btn" href="/formations">Découvrir la formation</Link>
              <Link className="btn btn-ghost" href="/classroom">Voir les Classrooms</Link>
            </div>
            <div className="hero-stats">
              <div><strong>6</strong><span>modules pratiques</span></div>
              <div><strong>100%</strong><span>en ligne</span></div>
              <div><strong>Live</strong><span>avec formateur</span></div>
            </div>
          </div>
          <div className="hero-card">
            <div className="browser-dots"><i></i><i></i><i></i></div>
            <div className="lesson-card">
              <span className="tag">En cours</span>
              <h3>Créer 30 publications avec ChatGPT</h3>
              <p>Module 3 · Création de contenu avec l'IA</p>
              <div className="progress"><span style={{width:"65%"}} /></div>
              <div className="lesson-meta"><span>Progression</span><strong>65%</strong></div>
            </div>
            <div className="live-card">
              <span className="live-dot"></span>
              <div><strong>Prochaine Classroom</strong><p>Mardi · 19:00</p></div>
              <button>Rejoindre</button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow">Pourquoi Vydys Academy ?</span><h2>Une formation conçue pour passer à l'action.</h2></div><p>Pas de théorie interminable. Chaque module vous aide à produire quelque chose d'utile pour votre activité.</p></div>
          <div className="feature-grid">{features.map(([title, text], i) => <article className="feature" key={title}><span className="feature-num">0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>

      <section className="section muted">
        <div className="container course-showcase">
          <div>
            <span className="eyebrow">Formation principale</span>
            <h2>Marketing Digital & Intelligence Artificielle</h2>
            <p>De zéro à votre première campagne : stratégie, contenu, ChatGPT, Canva, réseaux sociaux, publicité et conversion.</p>
            <ul className="check-list"><li>6 modules structurés</li><li>Quiz & exercices pratiques</li><li>Classroom et replays</li><li>Projet final et certificat</li></ul>
            <Link href="/formations" className="text-link">Voir le programme →</Link>
          </div>
          <div className="pricing-card">
            <span className="tag">Lancement</span>
            <p className="price"><strong>1 500</strong> MRU</p>
            <p>Formation complète + Classroom + certificat</p>
            <Link href="/connexion" className="btn full">S'inscrire en ligne</Link>
            <small>Paiement en ligne à connecter avant ouverture publique.</small>
          </div>
        </div>
      </section>

      <section className="section cta-section"><div className="container cta"><div><span className="eyebrow">Votre prochaine compétence commence ici</span><h2>Rejoignez Vydys Academy.</h2></div><Link className="btn btn-light" href="/connexion">Créer mon compte</Link></div></section>
    </>
  );
}
