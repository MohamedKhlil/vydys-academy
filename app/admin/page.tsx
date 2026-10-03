"use client";

import { useLanguage } from "../../components/language-provider";

const payments = [
  { name:"Ahmed M.", method:"Click", amount:"1 350 MRU", status:"pending" },
  { name:"Fatimetou S.", method:"Bankily / Sedad", amount:"1 500 MRU", status:"pending" },
];

export default function AdminPage(){
  const { t } = useLanguage();
  const stats = [
    [t({fr:"Étudiants actifs",ar:"الطلاب النشطون",en:"Active students"}),"128","+18"],
    [t({fr:"Classrooms",ar:"الفصول",en:"Classrooms"}),"6","3"],
    [t({fr:"Paiements à valider",ar:"دفعات للمراجعة",en:"Payments to review"}),"2",""],
    [t({fr:"Revenus",ar:"الإيرادات",en:"Revenue"}),"186 500 MRU",""],
  ];
  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Direction / Administration",ar:"الإدارة",en:"Management / Admin"})}</span><h1>{t({fr:"Tableau de bord",ar:"لوحة التحكم",en:"Dashboard"})}</h1><p>{t({fr:"Gérez les formations, étudiants et validations de paiement.",ar:"إدارة الدورات والطلاب والتحقق من الدفعات.",en:"Manage courses, students and payment approvals."})}</p></div><button className="btn">{t({fr:"+ Nouvelle formation",ar:"+ دورة جديدة",en:"+ New course"})}</button></div>

    <div className="stat-grid">{stats.map(([a,b,c])=><article className="panel stat" key={a}><span>{a}</span><strong>{b}</strong>{c && <small>{c}</small>}</article>)}</div>

    <article className="panel admin-payments">
      <div className="admin-section-head"><div><span className="tag">{t({fr:"Validation manuelle",ar:"مراجعة يدوية",en:"Manual approval"})}</span><h2>{t({fr:"Preuves de paiement en attente",ar:"إثباتات الدفع قيد المراجعة",en:"Pending payment proofs"})}</h2></div><p>{t({fr:"La Direction vérifie la capture et le montant avant d'activer l'accès.",ar:"تتحقق الإدارة من لقطة الشاشة والمبلغ قبل تفعيل الوصول.",en:"Management checks the screenshot and amount before granting access."})}</p></div>
      <div className="payment-review-list">
        {payments.map((p)=><div className="payment-review" key={p.name}>
          <div className="proof-thumb">IMG</div>
          <div className="payment-review-main"><strong>{p.name}</strong><span>{p.method} · {p.amount}</span><small>{t({fr:"Preuve reçue · En attente",ar:"تم استلام الإثبات · قيد المراجعة",en:"Proof received · Pending"})}</small></div>
          <div className="review-actions"><button className="approve">{t({fr:"Valider",ar:"قبول",en:"Approve"})}</button><button className="reject">{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div>
        </div>)}
      </div>
    </article>

    <div className="dash-grid admin-secondary"><article className="panel dash-main"><h2>{t({fr:"Dernières inscriptions",ar:"آخر التسجيلات",en:"Latest enrollments"})}</h2><div className="table"><div className="tr head"><span>{t({fr:"Étudiant",ar:"الطالب",en:"Student"})}</span><span>{t({fr:"Formation",ar:"الدورة",en:"Course"})}</span><span>{t({fr:"Statut",ar:"الحالة",en:"Status"})}</span></div><div className="tr"><span>Ahmed M.</span><span>Marketing Digital & IA</span><span className="status pending">{t({fr:"En attente",ar:"قيد المراجعة",en:"Pending"})}</span></div><div className="tr"><span>Fatimetou S.</span><span>Marketing Digital & IA</span><span className="status pending">{t({fr:"En attente",ar:"قيد المراجعة",en:"Pending"})}</span></div></div></article><aside className="dash-side"><article className="panel"><h3>{t({fr:"Actions rapides",ar:"إجراءات سريعة",en:"Quick actions"})}</h3><div className="quick-actions"><button>{t({fr:"Créer une Classroom",ar:"إنشاء فصل",en:"Create Classroom"})}</button><button>{t({fr:"Ajouter un formateur",ar:"إضافة مدرب",en:"Add instructor"})}</button><button>{t({fr:"Publier une annonce",ar:"نشر إعلان",en:"Post announcement"})}</button><button>{t({fr:"Générer les certificats",ar:"إنشاء الشهادات",en:"Generate certificates"})}</button></div></article></aside></div>
  </div></section>
}
