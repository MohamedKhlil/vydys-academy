import Link from "next/link";

export default function DashboardPage(){
  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Espace étudiant</span><h1>Bonjour 👋</h1><p>Continuez votre apprentissage là où vous vous êtes arrêté.</p></div><div className="avatar">MK</div></div>
    <div className="dash-grid">
      <div className="dash-main">
        <article className="panel current-course"><div className="panel-title"><div><span className="tag">Formation en cours</span><h2>Marketing Digital & IA</h2></div><strong>42%</strong></div><div className="progress large"><span style={{width:"42%"}} /></div><p>Prochaine leçon : <b>Créer 30 publications avec ChatGPT</b></p><Link className="btn" href="/formations">Continuer la formation</Link></article>
        <article className="panel"><h2>Mes modules</h2><div className="student-modules"><div><span>✓</span><p><b>Module 1</b><small>Fondations du marketing digital</small></p></div><div><span>✓</span><p><b>Module 2</b><small>ChatGPT pour le marketing</small></p></div><div className="active"><span>▶</span><p><b>Module 3</b><small>Création de contenu avec l'IA</small></p></div><div><span>🔒</span><p><b>Module 4</b><small>Publicité sur les réseaux sociaux</small></p></div></div></article>
      </div>
      <aside className="dash-side"><article className="panel"><span className="tag live">LIVE</span><h3>Classroom mardi</h3><p>19:00 · Créer une campagne Meta Ads avec l'IA.</p><Link href="/classroom" className="btn full">Voir ma Classroom</Link></article><article className="panel"><h3>Projet final</h3><p>0/3 livrables remis</p><div className="progress"><span style={{width:"8%"}} /></div></article></aside>
    </div>
  </div></section>
}
