"use client";

import { useLanguage } from "../../components/language-provider";

export default function ConditionsPage(){
  const {t}=useLanguage();
  return <section className="section page-top"><div className="container legal-page">
    <span className="eyebrow">Vydys Academy</span>
    <h1>{t({fr:"Conditions d’utilisation",ar:"شروط الاستخدام",en:"Terms of Use"})}</h1>
    <p>{t({fr:"Version de préparation au lancement public. Une validation juridique locale est recommandée avant ouverture commerciale.",ar:"نسخة تحضيرية للإطلاق العام. يوصى بمراجعة قانونية محلية قبل الإطلاق التجاري.",en:"Pre-launch version. Local legal review is recommended before commercial launch."})}</p>
    <article className="panel legal-card"><h2>1. {t({fr:"Objet",ar:"الغرض",en:"Purpose"})}</h2><p>{t({fr:"Vydys Academy met en relation des étudiants et des formateurs indépendants, et fournit les outils nécessaires pour publier, vendre et suivre des formations.",ar:"تربط Vydys Academy بين الطلاب والمدربين المستقلين وتوفر أدوات نشر وبيع ومتابعة الدورات.",en:"Vydys Academy connects students with independent instructors and provides tools to publish, sell and follow courses."})}</p></article>
    <article className="panel legal-card"><h2>2. {t({fr:"Comptes",ar:"الحسابات",en:"Accounts"})}</h2><p>{t({fr:"Chaque utilisateur est responsable des informations fournies, de la confidentialité de son compte et de l’utilisation qui en est faite.",ar:"كل مستخدم مسؤول عن المعلومات المقدمة وعن سرية حسابه واستخدامه.",en:"Each user is responsible for the information provided, account confidentiality and account activity."})}</p></article>
    <article className="panel legal-card"><h2>3. {t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</h2><p>{t({fr:"Les profils et formations peuvent être soumis à validation. Vydys peut retirer un contenu qui ne respecte pas ses règles ou les droits de tiers.",ar:"قد تخضع ملفات المدربين والدورات للمراجعة. يمكن لـ Vydys إزالة المحتوى المخالف للقواعد أو حقوق الغير.",en:"Instructor profiles and courses may be reviewed. Vydys may remove content that violates platform rules or third-party rights."})}</p></article>
    <article className="panel legal-card"><h2>4. {t({fr:"Paiements",ar:"المدفوعات",en:"Payments"})}</h2><p>{t({fr:"Les modalités de paiement, réductions et remboursements applicables sont affichées avant l’achat. Les preuves de paiement peuvent faire l’objet d’une vérification manuelle.",ar:"يتم عرض طرق الدفع والخصومات وسياسة الاسترداد قبل الشراء. قد تتم مراجعة إثباتات الدفع يدوياً.",en:"Applicable payment methods, discounts and refund rules are shown before purchase. Payment proofs may be manually reviewed."})}</p></article>
    <article className="panel legal-card"><h2>5. {t({fr:"Comportement",ar:"السلوك",en:"Conduct"})}</h2><p>{t({fr:"La fraude, l’usurpation d’identité, le partage non autorisé de contenus et les atteintes aux autres utilisateurs sont interdits.",ar:"يُحظر الاحتيال وانتحال الهوية والمشاركة غير المصرح بها للمحتوى والإضرار بالمستخدمين الآخرين.",en:"Fraud, impersonation, unauthorized content sharing and abuse of other users are prohibited."})}</p></article>
  </div></section>
}
