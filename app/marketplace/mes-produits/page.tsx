"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function MyMarketplaceProductsPage(){
  const {t}=useLanguage();
  const [userId,setUserId]=useState("");
  const [products,setProducts]=useState<any[]>([]);
  const [fees,setFees]=useState<any[]>([]);
  const [methods,setMethods]=useState<any[]>([]);
  const [proofs,setProofs]=useState<Record<string,File|null>>({});
  const [references,setReferences]=useState<Record<string,string>>({});
  const [providers,setProviders]=useState<Record<string,string>>({});
  const [notice,setNotice]=useState("");const [busy,setBusy]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    setUserId(user.id);
    const [{data:p},{data:f},{data:m}]=await Promise.all([
      supabase.from("marketplace_products").select("*").eq("seller_id",user.id).order("created_at",{ascending:false}),
      supabase.from("marketplace_listing_fee_orders").select("*").eq("seller_id",user.id).order("created_at",{ascending:false}),
      supabase.from("platform_payment_methods").select("provider_code,label,account_number,currency,instructions,payment_mode").eq("is_active",true).eq("payment_mode","manual")
    ]);
    setProducts(p||[]);setFees(f||[]);setMethods(m||[]);
    const defaults:Record<string,string>={};(f||[]).forEach((x:any)=>{if(!providers[x.id]&&m?.[0])defaults[x.id]=m[0].provider_code});setProviders(v=>({...v,...defaults}));
  }
  useEffect(()=>{load()},[]);

  async function submitFee(e:FormEvent,order:any){
    e.preventDefault();setNotice("");setBusy(order.id);
    let path="";
    if(Number(order.amount)>0){
      const file=proofs[order.id];if(!file){setNotice(t({fr:"Ajoutez la preuve du paiement.",ar:"أضف إثبات الدفع.",en:"Add payment proof."}));setBusy("");return}
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      path=`${userId}/${order.id}/${crypto.randomUUID()}-${safe}`;
      const {error:up}=await supabase.storage.from("marketplace-fees").upload(path,file,{contentType:file.type});
      if(up){setNotice(up.message);setBusy("");return}
    }
    const {error}=await supabase.rpc("submit_marketplace_listing_fee",{
      p_order_id:order.id,
      p_provider_code:providers[order.id]||"",
      p_transaction_reference:references[order.id]||"",
      p_proof_path:path
    });
    setBusy("");setNotice(error?error.message:t({fr:"Frais envoyé pour validation.",ar:"تم إرسال الرسوم للمراجعة.",en:"Listing fee submitted for review."}));await load();
  }

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Marketplace</span><h1>{t({fr:"Mes produits",ar:"منتجاتي",en:"My products"})}</h1><p>{t({fr:"Suivez la publication et réglez les frais Vydys lorsqu’ils sont requis.",ar:"تابع النشر وادفع رسوم Vydys عند الحاجة.",en:"Track publishing and pay Vydys listing fees when required."})}</p></div><div className="dash-actions"><Link className="btn btn-ghost" href="/marketplace/mes-ventes">{t({fr:"Mes ventes",ar:"مبيعاتي",en:"My sales"})}</Link><Link className="btn" href="/marketplace/vendre">+ {t({fr:"Nouveau produit",ar:"منتج جديد",en:"New product"})}</Link></div></div>
    {notice&&<p className="manual-note">{notice}</p>}
    <div className="marketplace-manage-list">{products.map(p=>{const fee=fees.find(x=>x.product_id===p.id);const canPay=fee&&["pending","rejected","failed"].includes(fee.status);const method=methods.find(m=>m.provider_code===(providers[fee?.id]||methods[0]?.provider_code));return <article className="panel" key={p.id}><div className="marketplace-manage-head"><div><span className={"tag "+p.status}>{p.status}</span><h2>{p.title}</h2><p>{p.price} {p.currency} · {p.product_type}</p></div>{p.status==="published"&&<Link className="btn btn-small btn-ghost" href={"/marketplace/"+p.slug}>{t({fr:"Voir",ar:"عرض",en:"View"})}</Link>}</div>
      {fee&&<div className="listing-fee-status"><span>{t({fr:"Frais Vydys",ar:"رسوم Vydys",en:"Vydys fee"})}</span><strong>{fee.amount} {fee.currency}</strong><b>{fee.status}</b></div>}
      {canPay&&<form className="listing-fee-form" onSubmit={e=>submitFee(e,fee)}>
        {Number(fee.amount)>0&&<><select value={providers[fee.id]||methods[0]?.provider_code||""} onChange={e=>setProviders(v=>({...v,[fee.id]:e.target.value}))}>{methods.map(m=><option key={m.provider_code} value={m.provider_code}>{m.label||m.provider_code} · {m.currency}</option>)}</select>{method&&<div className="seller-payment-details"><strong>{method.account_number}</strong><p>{method.instructions}</p></div>}<input value={references[fee.id]||""} onChange={e=>setReferences(v=>({...v,[fee.id]:e.target.value}))} placeholder={t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}/><label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProofs(v=>({...v,[fee.id]:e.target.files?.[0]||null}))}/><span>↑</span><strong>{proofs[fee.id]?.name||t({fr:"Preuve du paiement Vydys",ar:"إثبات دفع Vydys",en:"Vydys payment proof"})}</strong></label></>}
        <button className="btn btn-small" disabled={busy===fee.id||Number(fee.amount)>0&&!methods.length}>{busy===fee.id?"...":Number(fee.amount)===0?t({fr:"Envoyer en validation",ar:"إرسال للمراجعة",en:"Submit for review"}):t({fr:"Envoyer le paiement",ar:"إرسال الدفع",en:"Submit payment"})}</button>
      </form>}
    </article>})}</div>
    {products.length===0&&<article className="panel"><p>{t({fr:"Vous n’avez encore aucun produit.",ar:"لا توجد منتجات بعد.",en:"You have no products yet."})}</p></article>}
  </div></section>
}
