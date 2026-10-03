"use client";

import { useLanguage } from "../../components/language-provider";

export default function ConfidentialitePage(){
  const {t}=useLanguage();
  return <section className="section page-top"><div className="container legal-page">
    <span className="eyebrow">Vydys Academy</span>
    <h1>{t({fr:"Politique de confidentialité",ar:"سياسة الخصوصية",en:"Privacy Policy"})}</h1>
    <p>{t({fr:"Version de préparation au lancement public. Une validation juridique locale est recommandée.",ar:"نسخة تحضيرية للإطلاق العام. يوصى بمراجعة قانونية محلية.",en:"Pre-launch version. Local legal review is recommended."})}</p>
    <article className="panel legal-card"><h2>{t({fr:"Données utilisées",ar:"البيانات المستخدمة",en:"Data we use"})}</h2><p>{t({fr:"La plateforme peut traiter les informations de compte, inscriptions, paiements, progression pédagogique, messages et interactions nécessaires au fonctionnement du service.",ar:"قد تعالج المنصة بيانات الحساب والتسجيل والمدفوعات والتقدم الدراسي والرسائل والتفاعلات اللازمة لتشغيل الخدمة.",en:"The platform may process account, enrollment, payment, learning progress, messaging and interaction data needed to operate the service."})}</p></article>
    <article className="panel legal-card"><h2>{t({fr:"Finalités",ar:"الأغراض",en:"Purposes"})}</h2><p>{t({fr:"Ces données servent notamment à fournir les formations, vérifier les paiements, sécuriser les comptes, améliorer le service et traiter les demandes d’assistance.",ar:"تُستخدم هذه البيانات لتقديم الدورات والتحقق من المدفوعات وتأمين الحسابات وتحسين الخدمة ومعالجة طلبات المساعدة.",en:"This data is used to deliver courses, verify payments, protect accounts, improve the service and handle support requests."})}</p></article>
    <article className="panel legal-card"><h2>{t({fr:"Accès",ar:"الوصول",en:"Access"})}</h2><p>{t({fr:"Les informations sont accessibles uniquement aux utilisateurs et équipes autorisés selon leur rôle. Les preuves de paiement et contenus privés ne sont pas destinés à être publics.",ar:"لا يمكن الوصول إلى المعلومات إلا من قبل المستخدمين والفرق المصرح لهم حسب الدور. إثباتات الدفع والمحتوى الخاص ليست عامة.",en:"Information is accessible only to authorized users and teams according to role. Payment proofs and private content are not intended to be public."})}</p></article>
    <article className="panel legal-card"><h2>{t({fr:"Conservation et droits",ar:"الاحتفاظ والحقوق",en:"Retention and rights"})}</h2><p>{t({fr:"Vydys conserve les données aussi longtemps que nécessaire au service, à la sécurité et aux obligations applicables. Les utilisateurs peuvent demander l’examen ou la correction de leurs informations via le support.",ar:"تحتفظ Vydys بالبيانات للمدة اللازمة لتقديم الخدمة والأمان والالتزامات المعمول بها. يمكن للمستخدمين طلب مراجعة أو تصحيح بياناتهم عبر الدعم.",en:"Vydys retains data as needed for service delivery, security and applicable obligations. Users may request review or correction of their information through support."})}</p></article>
  </div></section>
}
