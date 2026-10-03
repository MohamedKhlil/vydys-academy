"use client";

import { useLanguage } from "../../components/language-provider";

export default function RefundPage(){
  const {t}=useLanguage();
  return <section className="section page-top"><div className="container legal-page">
    <span className="eyebrow">Vydys Academy</span>
    <h1>{t({fr:"Politique de remboursement",ar:"سياسة الاسترداد",en:"Refund Policy"})}</h1>
    <p>{t({fr:"Les remboursements ne sont pas automatiques et sont examinés selon la nature du paiement, l’accès déjà consommé et les circonstances du dossier.",ar:"لا تتم عمليات الاسترداد تلقائياً بل تتم مراجعتها حسب نوع الدفع والاستخدام والظروف.",en:"Refunds are not automatic and are reviewed according to the payment, course access already used and the circumstances of the request."})}</p>
    <article className="panel legal-card"><h2>{t({fr:"Cas pouvant être examinés",ar:"الحالات التي يمكن مراجعتها",en:"Cases that may be reviewed"})}</h2><p>{t({fr:"Double paiement, paiement validé sans accès à la formation, contenu retiré avant utilisation significative, ou erreur technique confirmée.",ar:"الدفع المكرر، الدفع المؤكد دون وصول للدورة، إزالة المحتوى قبل الاستخدام الفعلي، أو خطأ تقني مؤكد.",en:"Duplicate payment, approved payment without course access, content removed before significant use, or a confirmed technical error."})}</p></article>
    <article className="panel legal-card"><h2>{t({fr:"Preuves",ar:"الإثباتات",en:"Evidence"})}</h2><p>{t({fr:"Conservez la référence de transaction et la preuve de paiement. Ces éléments peuvent être demandés pour examiner une réclamation.",ar:"احتفظ بمرجع العملية وإثبات الدفع، فقد يتم طلبهما عند مراجعة المطالبة.",en:"Keep the transaction reference and payment proof. They may be requested when reviewing a claim."})}</p></article>
    <article className="panel legal-card"><h2>{t({fr:"Formations de formateurs indépendants",ar:"دورات المدربين المستقلين",en:"Independent instructor courses"})}</h2><p>{t({fr:"Lorsqu’un paiement est reçu directement par un formateur, celui-ci reste impliqué dans le traitement du dossier. Vydys peut intervenir pour documenter et faciliter l’examen du litige.",ar:"عندما يتلقى المدرب الدفع مباشرة، يظل طرفاً في معالجة الطلب ويمكن لـ Vydys المساعدة في توثيق ومراجعة النزاع.",en:"When an instructor receives payment directly, the instructor remains involved in the case. Vydys may help document and facilitate the dispute review."})}</p></article>
  </div></section>
}
