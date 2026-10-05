"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function PublicProfilePage(){
  const {username}=useParams<{username:string}>();const {t}=useLanguage();
  const [profile,setProfile]=useState<any>(null);const [seller,setSeller]=useState<any>(null);const [viewer,setViewer]=useState("");const [following,setFollowing]=useState(false);const [activity,setActivity]=useState<any[]>([]);
  async function load(){
    const {data:p}=await supabase.from("public_profiles").select("*").ilike("username",username).maybeSingle();setProfile(p);
    const {data:{user}}=await supabase.auth.getUser();setViewer(user?.id||"");
    if(p){
      const [{data:s},{data:a},{data:f}]=await Promise.all([
        supabase.from("marketplace_seller_profiles").select("*").eq("user_id",p.user_id).maybeSingle(),
        supabase.from("activity_feed").select("*").eq("actor_id",p.user_id).order("created_at",{ascending:false}).limit(20),
        user?supabase.from("user_follows").select("following_id").eq("follower_id",user.id).eq("following_id",p.user_id).maybeSingle():Promise.resolve({data:null})
      ]);
      setSeller(s);setActivity(a||[]);setFollowing(!!f);
    }
  }
  useEffect(()=>{load()},[username]);
  async function toggleFollow(){
    if(!viewer){window.location.href="/connexion";return}
    if(!profile||viewer===profile.user_id)return;
    if(following)await supabase.from("user_follows").delete().eq("follower_id",viewer).eq("following_id",profile.user_id);
    else await supabase.from("user_follows").insert({follower_id:viewer,following_id:profile.user_id});
    await load();
  }
  if(!profile)return <section className="section page-top"><div className="container"><article className="panel"><h1>{t({fr:"Profil introuvable",ar:"الملف غير موجود",en:"Profile not found"})}</h1></article></div></section>;
  return <section className="section page-top public-profile-page"><div className="container">
    <div className="public-profile-hero">
      <div className="settings-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{(profile.full_name||profile.username||"V").slice(0,2).toUpperCase()}</span>}</div>
      <div className="public-profile-main"><div className="public-profile-name"><h1>{profile.full_name||profile.username}</h1>{seller?.verified_status==="verified"&&<span>✓ {t({fr:"Vendeur vérifié",ar:"بائع موثّق",en:"Verified seller"})}</span>}</div><p>@{profile.username}</p><p>{profile.bio}</p><div className="public-profile-stats"><span><strong>{profile.followers_count}</strong>{t({fr:"Followers",ar:"متابعون",en:"Followers"})}</span><span><strong>{profile.following_count}</strong>{t({fr:"Abonnements",ar:"يتابع",en:"Following"})}</span><span><strong>{profile.reputation_score}</strong>{t({fr:"Réputation",ar:"السمعة",en:"Reputation"})}</span></div></div>
      {viewer&&viewer!==profile.user_id&&<button className={following?"btn btn-ghost":"btn"} onClick={toggleFollow}>{following?t({fr:"Suivi",ar:"متابَع",en:"Following"}):t({fr:"Suivre",ar:"متابعة",en:"Follow"})}</button>}
    </div>
    <div className="public-profile-layout">
      <main><div className="hub-section-head"><div><span className="eyebrow">{t({fr:"Activité",ar:"النشاط",en:"Activity"})}</span><h2>{t({fr:"Activité récente",ar:"النشاط الأخير",en:"Recent activity"})}</h2></div></div><div className="activity-feed-list">{activity.map(a=><Link href={a.link||"#"} key={a.id}><span>{a.activity_type}</span><div><strong>{a.title}</strong><p>{a.body}</p><small>{new Date(a.created_at).toLocaleString()}</small></div></Link>)}{activity.length===0&&<article className="panel"><p>{t({fr:"Aucune activité publique.",ar:"لا يوجد نشاط عام.",en:"No public activity yet."})}</p></article>}</div></main>
      <aside><article className="panel"><span className="eyebrow">Vydys Identity</span><h3>{profile.role}</h3><p>{t({fr:"Membre de la communauté Vydys.",ar:"عضو في مجتمع Vydys.",en:"Vydys community member."})}</p>{seller&&<Link className="text-link" href="/marketplace">{t({fr:"Voir la Marketplace",ar:"عرض المتجر",en:"View Marketplace"})} →</Link>}</article></aside>
    </div>
  </div></section>
}
