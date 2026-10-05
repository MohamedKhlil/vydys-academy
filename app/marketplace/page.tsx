"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function MarketplacePage(){
  const {lang,t}=useLanguage();const [products,setProducts]=useState<any[]>([]);const [profiles,setProfiles]=useState<Record<string,any>>({});const [search,setSearch]=useState("");const [category,setCategory]=useState("all");
  useEffect(()=>{(async()=>{const {data:p}=await supabase.from("marketplace_products").select("*").eq("status","published").order("created_at",{ascending:false});setProducts(p||[]);const ids=[...new Set((p||[]).map((x:any)=>x.seller_id))];if(ids.length){const {data:pr}=await supabase.from("public_profiles").select("user_id,full_name,username,avatar_url").in("user_id",ids);const m:Record<string,any>={};(pr||[]).forEach((x:any)=>m[x.user_id]=x);setProfiles(m)}})()},[]);
  const categories=useMemo(()=>[...new Set(products.map(x=>x.category).filter(Boolean))],[products]);
  const shown=useMemo(()=>products.filter(p=>(category==="all"||p.category===category)&&(!search.trim()||[p.title,p.description,p.category].join(" ").toLowerCase().includes(search.toLowerCase()))),[products,search,category]);
  return <section className="section page-top marketplace-vydys"><div className="container">
    <div className="page-hero"><span className="eyebrow">Vydys Marketplace</span><h1>{t({fr:"Créez. Vendez. Soyez payé directement.",ar:"أنشئ. بِع. واستلم أموالك مباشرة.",en:"Create. Sell. Get paid directly."})}</h1><p>{t({fr:"Les vendeurs reçoivent directement le paiement de leurs clients. Vydys facture uniquement les frais de publication du produit.",ar:"يستلم البائعون مدفوعاتهم مباشرة من العملاء. تفرض Vydys فقط رسوم نشر المنتج.",en:"Sellers receive customer payments directly. Vydys only charges the product listing fee."})}</p><Link className="btn" href="/marketplace/vendre">{t({fr:"Vendre un produit",ar:"بيع منتج",en:"Sell a product"})}</Link></div>
    <div className="marketplace-vydys-filters"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t({fr:"Rechercher un produit…",ar:"ابحث عن منتج…",en:"Search products…"})}/><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">{t({fr:"Toutes les catégories",ar:"كل الفئات",en:"All categories"})}</option>{categories.map(c=><option value={c} key={c}>{c}</option>)}</select></div>
    <div className="marketplace-vydys-grid">{shown.map(p=>{const seller=profiles[p.seller_id];return <Link className="marketplace-vydys-card" href={"/marketplace/"+p.slug} key={p.id}><div className="marketplace-vydys-cover">{p.image_url?<img src={p.image_url} alt=""/>:<span>V</span>}<b>{p.product_type}</b></div><div><small>{p.category||"Vydys"}</small><h2>{p.title}</h2><p>{p.description}</p><div><span>{seller?.full_name||seller?.username||"Vydys seller"}</span><strong>{new Intl.NumberFormat(lang==="en"?"en-US":"fr-FR",{style:"currency",currency:p.currency}).format(Number(p.price))}</strong></div></div></Link>})}</div>
    {shown.length===0&&<article className="panel"><p>{t({fr:"Aucun produit publié pour le moment.",ar:"لا توجد منتجات منشورة حالياً.",en:"No published products yet."})}</p></article>}
  </div></section>
}
