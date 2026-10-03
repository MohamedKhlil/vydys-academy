"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";

type Method = "click" | "bankily";

const BASE_PRICE = 1500;
const CLICK_DISCOUNT = 0.10;

export default function PaiementPage() {
  const { t } = useLanguage();
  const [method, setMethod] = useState<Method>("click");
  const [proofName, setProofName] = useState("");

  const amount = useMemo(
    () => method === "click" ? Math.round(BASE_PRICE * (1 - CLICK_DISCOUNT)) : BASE_PRICE,
    [method]
  );

  return (
    <section className="section page-top payment-page">
      <div className="container payment-layout">
        <div>
          <span className="eyebrow">{t({fr:"Inscription",ar:"التسجيل",en:"Enrollment"})}</span>
          <h1 className="payment-title">{t({
            fr:"Finalisez votre inscription",
            ar:"أكمل تسجيلك",
            en:"Complete your enrollment"
          })}</h1>
          <p className="payment-intro">{t({
            fr:"Choisissez votre moyen de paiement, effectuez le transfert puis envoyez une capture d'écran comme preuve. La Direction vérifiera manuellement le paiement avant d'activer la formation.",
            ar:"اختر وسيلة الدفع، قم بالتحويل ثم أرسل لقطة شاشة كإثبات. ستقوم الإدارة بالتحقق من الدفع يدوياً قبل تفعيل الدورة.",
            en:"Choose your payment method, make the transfer, then upload a screenshot as proof. Management will manually verify the payment before activating the course."
          })}</p>

          <div className="payment-methods">
            <button className={method==="click" ? "payment-option selected" : "payment-option"} onClick={() => setMethod("click")}>
              <div>
                <strong>Click</strong>
                <span>{t({fr:"10 % de réduction",ar:"خصم 10٪",en:"10% discount"})}</span>
              </div>
              <b>1 350 MRU</b>
            </button>
            <button className={method==="bankily" ? "payment-option selected" : "payment-option"} onClick={() => setMethod("bankily")}>
              <div>
                <strong>Bankily / Sedad</strong>
                <span>{t({fr:"Tarif standard",ar:"السعر العادي",en:"Standard price"})}</span>
              </div>
              <b>1 500 MRU</b>
            </button>
          </div>

          <article className="panel payment-instructions">
            <span className="tag">{t({fr:"Étape 1",ar:"الخطوة 1",en:"Step 1"})}</span>
            <h2>{t({fr:"Effectuez le paiement",ar:"قم بالدفع",en:"Make the payment"})}</h2>
            {method === "click" ? (
              <>
                <p>{t({
                  fr:"Envoyez exactement le montant ci-dessous sur le numéro Click :",
                  ar:"أرسل المبلغ المحدد أدناه إلى رقم Click:",
                  en:"Send exactly the amount below to this Click number:"
                })}</p>
                <div className="pay-number"><span>Click</span><strong>34540455</strong></div>
              </>
            ) : (
              <>
                <p>{t({
                  fr:"Effectuez le paiement via Bankily / Sedad pour le montant indiqué. Les références du bénéficiaire doivent être celles communiquées par Vydys Academy.",
                  ar:"قم بالدفع عبر Bankily / Sedad بالمبلغ الموضح. يجب استخدام بيانات المستفيد المعتمدة من Vydys Academy.",
                  en:"Pay via Bankily / Sedad for the amount shown. Use the beneficiary details provided by Vydys Academy."
                })}</p>
              </>
            )}
            <div className="amount-box">
              <span>{t({fr:"Montant à payer",ar:"المبلغ المطلوب",en:"Amount to pay"})}</span>
              <strong>{amount.toLocaleString("fr-FR")} MRU</strong>
              {method==="click" && <small>{t({fr:"Économie : 150 MRU",ar:"التوفير: 150 أوقية",en:"You save: 150 MRU"})}</small>}
            </div>
          </article>

          <article className="panel proof-panel">
            <span className="tag">{t({fr:"Étape 2",ar:"الخطوة 2",en:"Step 2"})}</span>
            <h2>{t({fr:"Envoyez votre preuve de paiement",ar:"أرسل إثبات الدفع",en:"Upload your payment proof"})}</h2>
            <p>{t({
              fr:"La capture doit montrer clairement le montant payé et la confirmation de la transaction.",
              ar:"يجب أن تُظهر لقطة الشاشة بوضوح المبلغ المدفوع وتأكيد العملية.",
              en:"The screenshot must clearly show the amount paid and the transaction confirmation."
            })}</p>
            <label className="upload-zone">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e)=>setProofName(e.target.files?.[0]?.name ?? "")} />
              <span>↑</span>
              <strong>{proofName || t({fr:"Choisir une capture d'écran",ar:"اختر لقطة شاشة",en:"Choose a screenshot"})}</strong>
              <small>PNG, JPG, WEBP</small>
            </label>
            <label className="form-field">
              <span>{t({fr:"Nom complet",ar:"الاسم الكامل",en:"Full name"})}</span>
              <input placeholder={t({fr:"Votre nom",ar:"اسمك",en:"Your name"})} />
            </label>
            <label className="form-field">
              <span>{t({fr:"Téléphone",ar:"رقم الهاتف",en:"Phone number"})}</span>
              <input placeholder="22 00 00 00" inputMode="tel" />
            </label>
            <label className="form-field">
              <span>{t({fr:"Référence de transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span>
              <input placeholder={t({fr:"Si disponible",ar:"إن وجد",en:"If available"})} />
            </label>
            <button className="btn full" type="button">{t({
              fr:"Envoyer pour validation",
              ar:"إرسال للمراجعة",
              en:"Submit for approval"
            })}</button>
            <p className="manual-note">{t({
              fr:"Après l'envoi, votre paiement passe au statut « En attente ». L'accès à la formation est activé uniquement après validation manuelle par la Direction.",
              ar:"بعد الإرسال ستكون حالة الدفع «قيد المراجعة». يتم تفعيل الوصول إلى الدورة فقط بعد موافقة الإدارة يدوياً.",
              en:"After submission, your payment status becomes “Pending”. Course access is activated only after manual approval by Management."
            })}</p>
          </article>
        </div>

        <aside className="panel payment-summary">
          <span className="tag">{t({fr:"Votre commande",ar:"طلبك",en:"Your order"})}</span>
          <h3>Marketing Digital & IA</h3>
          <div className="summary-row"><span>{t({fr:"Prix formation",ar:"سعر الدورة",en:"Course price"})}</span><strong>1 500 MRU</strong></div>
          {method==="click" && <div className="summary-row discount"><span>{t({fr:"Réduction Click -10 %",ar:"خصم Click -10٪",en:"Click discount -10%"})}</span><strong>-150 MRU</strong></div>}
          <div className="summary-total"><span>{t({fr:"Total",ar:"الإجمالي",en:"Total"})}</span><strong>{amount.toLocaleString("fr-FR")} MRU</strong></div>
          <div className="pending-card">
            <span>⏳</span>
            <div><strong>{t({fr:"Validation manuelle",ar:"مراجعة يدوية",en:"Manual approval"})}</strong><p>{t({fr:"Par la Direction Vydys Academy",ar:"من طرف إدارة Vydys Academy",en:"By Vydys Academy Management"})}</p></div>
          </div>
        </aside>
      </div>
    </section>
  );
}
