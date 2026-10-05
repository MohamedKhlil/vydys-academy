"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminMarketplacePage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState(false);const [loading,setLoading]=useState(true);
  const [settings,setSettings]=useState<any>({listing_fee_amount:0,listing_fee_currency:"USD"});
  const [products,setProducts]=useState<any[]>([]);const [fees,setFees]=useState<any[]>([]);const [notice,setNotice]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    if(!["admin","direction"].includes(p?.role)){setLoading(false);return}
    setAllowed(true);
    const [{data:s},{data:pr},{data:f}]=await Promise.all([
      supabase.from("marketplace_settings").select("*").eq("id",1).single(),
      supabase.from("marketplace_products").select("*").order("created_at",{ascending:false}),
      supabase.from("marketplace_listing_fee_orders").select("*").order("created_at",{ascending:false})
    ]);
    if(s)setSettings(s);setProducts(pr||[]);setFees(f||[]);setLoading(false);
  }
  useEffect(()=>{load()},[]);

  async function saveSettings(){
    const {error}=await supabase.from("marketplace_settings").update({listing_fee_amount:Number(settings.listing_fee_amount),listing_fee_currency:String(settings.listing_fee_currency).toUpperCase(),updated_at:new Date().toISOString()}).eq("id",1);
    setNotice(error?error.message:t({fr:"Frais Marketplace mis à jour.",ar:"تم تحديث رسوم المتجر.",en:"Marketplace fee updated."}));
  }

  async function approve(product:any){
    const fee=fees.find(x=>x.product_id===product.id);
    if(!fee){setNotice(t({fr:"Aucune commande de frais trouvée.",ar:"لا توجد رسوم مرتبطة.",en:"No listing fee order found."}));return}
    const now=new Date().toISOString();
    const [{error:e1},{error:e2}]=await Promise.all([
      supabase.from("marketplace_listing_fee_orders").update({status:Number(fee.amount)>0?"paid":"waived",paid_at:now}).eq("id",fee.id),
      supabase.from("marketplace_products").update({status:"published",listing_fee_status:Number(fee.amount)>0?"paid":"waived",published_at:now,updated_at:now}).eq("id",product.id)
    ]);
    setNotice(e1?.message||e2?.message||t({fr:"Produit publié.",ar:"تم نشر المنتج.",en:"Product published."}));await load();
  }

  async function reject(product:any){
    const {error}=await supabase.from("marketplace_products").update({status:"rejected",updated_at:new Date().toISOString()}).eq("id",product.id);
    setNotice(error?error.message:t({fr:"Produit refusé.",ar:"تم رفض المنتج.",en:"Product rejected."}));await load();
  }

  if(loading)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>Access denied</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Control · Marketplace</span><h1>{t({fr:"Marketplace Control",ar:"إدارة المتجر",en:"Marketplace Control"})}</h1><p>{t({fr:"Configurez les frais de publication et validez les produits.",ar:"اضبط رسوم النشر واعتمد المنتجات.",en:"Configure listing fees and approve products."})}</p></div><a className="btn btn-ghost" href="/admin/marketplace/vendeurs">${t({fr:"Vendeurs",ar:"البائعون",en:"Sellers"})}</a></div>
    <article className="panel admin-marketplace-fee"><div><span>{t({fr:"Frais par produit",ar:"رسوم لكل منتج",en:"Fee per product"})}</span><strong>{settings.listing_fee_amount} {settings.listing_fee_currency}</strong></div><div><input type="number" min="0" step="0.01" value={settings.listing_fee_amount} onChange={e=>setSettings({...settings,listing_fee_amount:e.target.value})}/><input value={settings.listing_fee_currency} onChange={e=>setSettings({...settings,listing_fee_currency:e.target.value})}/><button className="btn" onClick={saveSettings}>{t({fr:"Enregistrer",ar:"حفظ",en:"Save"})}</button></div></article>
    {notice&&<p className="manual-note">{notice}</p>}
    <div className="admin-marketplace-list">{products.map(p=>{const fee=fees.find(x=>x.product_id===p.id);return <article className="panel" key={p.id}><div><span className="tag">{p.status}</span><h2>{p.title}</h2><p>{p.category||p.product_type} · {p.price} {p.currency}</p><small>{t({fr:"Frais Vydys",ar:"رسوم Vydys",en:"Vydys fee"})}: {fee?fee.amount+" "+fee.currency+" · "+fee.status:"—"}</small></div><div>{p.status!=="published"&&<button className="btn btn-small" onClick={()=>approve(p)}>{t({fr:"Valider & publier",ar:"اعتماد ونشر",en:"Approve & publish"})}</button>}{p.status!=="rejected"&&<button className="btn btn-small btn-ghost" onClick={()=>reject(p)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button>}</div></article>})}</div>
  </div></section>
}
