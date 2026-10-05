"use client";
import { useEffect,useState } from "react";
import { useLanguage } from "../../../../components/language-provider";
import { supabase } from "../../../../lib/supabase";

export default function AdminSellersPage(){
  const {t}=useLanguage();const [rows,setRows]=useState<any[]>([]);const [profiles,setProfiles]=useState<Record<string,any>>({});const [allowed,setAllowed]=useState(false);
  async function load(){const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();if(!["admin","direction"].includes(p?.role))return;setAllowed(true);const {data:r}=await supabase.from("marketplace_seller_profiles").select("*").order("updated_at",{ascending:false});setRows(r||[]);const ids=[...new Set((r||[]).map((x:any)=>x.user_id))];if(ids.length){const {data:pp}=await supabase.from("public_profiles").select("*").in("user_id",ids);const m:Record<string,any>={};(pp||[]).forEach((x:any)=>m[x.user_id]=x);setProfiles(m)}}
  useEffect(()=>{load()},[]);
  async function setStatus(row:any,status:string){const now=new Date().toISOString();const {data:{user}}=await supabase.auth.getUser();await supabase.from("marketplace_seller_profiles").update({verified_status:status,verified_at:status==="verified"?now:null,verified_by:status==="verified"?user?.id:null,updated_at:now}).eq("user_id",row.user_id);await supabase.from("public_profiles").update({seller_verified:status==="verified"}).eq("user_id",row.user_id);await load()}
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>Access denied</h1></article></div></section>;
  return <section className="dashboard-shell"><div className="container"><div className="dash-header"><div><span className="eyebrow">Vydys Control</span><h1>{t({fr:"Vendeurs Marketplace",ar:"بائعو المتجر",en:"Marketplace sellers"})}</h1></div></div><div className="admin-marketplace-list">{rows.map(r=>{const p=profiles[r.user_id];return <article className="panel" key={r.user_id}><div><span className="tag">{r.verified_status}</span><h2>{r.store_name||p?.full_name||p?.username}</h2><p>{r.store_bio||p?.bio}</p></div><div><button className="btn btn-small" onClick={()=>setStatus(r,"verified")}>{t({fr:"Vérifier",ar:"توثيق",en:"Verify"})}</button><button className="btn btn-small btn-ghost" onClick={()=>setStatus(r,"rejected")}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div></article>})}</div></div></section>
}
