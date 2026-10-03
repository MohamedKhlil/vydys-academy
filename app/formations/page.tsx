import Link from "next/link";

const modules = [
  ["01", "Fondations du marketing digital", "Comprendre les canaux, le parcours client et construire une stratégie simple."],
  ["02", "ChatGPT pour le marketing", "Prompts, idées de contenu, textes publicitaires, emails et automatisation."],
  ["03", "Création de contenu avec l'IA", "Canva, images, scripts vidéo, Reels/TikTok et calendrier éditorial."],
  ["04", "Publicité sur les réseaux sociaux", "Meta Ads, objectifs, ciblage, budgets et analyse des résultats."],
  ["05", "Vendre sur Internet", "WhatsApp Business, landing pages, génération de prospects et conversion."],
  ["06", "Projet final", "Construire une campagne complète et présenter son projet pour la certification."],
];

export default function FormationsPage(){
  return <section className="section page-top"><div className="container">
    <div className="page-hero"><span className="eyebrow">Catalogue</span><h1>Des formations utiles pour développer vos compétences digitales.</h1><p>Commencez par notre parcours phare : Marketing Digital & IA.</p></div>
    <div className="course-banner"><div><span className="tag">Débutant → opérationnel</span><h2>Marketing Digital & Intelligence Artificielle</h2><p>Apprenez à utiliser les outils modernes du marketing et de l'IA dans un parcours guidé, avec Classroom en direct.</p><div className="pill-row"><span>6 modules</span><span>Classroom</span><span>Quiz</span><span>Certificat</span></div></div><div className="course-price"><strong>1 500 MRU</strong><Link className="btn" href="/connexion">S'inscrire</Link></div></div>
    <div className="module-list">{modules.map(([n,t,d])=><article className="module" key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div><b>→</b></article>)}</div>
  </div></section>
}
