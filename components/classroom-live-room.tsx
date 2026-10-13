"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Source="microphone"|"camera"|"screen";
type PubState={
  pc:RTCPeerConnection;
  stream:MediaStream;
  publicationId:string;
  providerSessionId:string;
};

const rtcConfig:RTCConfiguration={
  iceServers:[{urls:"stun:stun.cloudflare.com:3478"}],
  bundlePolicy:"max-bundle"
};

function waitForIce(pc:RTCPeerConnection){
  if(pc.iceGatheringState==="complete")return Promise.resolve();
  return new Promise<void>(resolve=>{
    const done=()=>{if(pc.iceGatheringState==="complete"){pc.removeEventListener("icegatheringstatechange",done);resolve()}};
    pc.addEventListener("icegatheringstatechange",done);
    setTimeout(()=>{pc.removeEventListener("icegatheringstatechange",done);resolve()},5000);
  });
}

export default function ClassroomLiveRoom({access}:{access:any}){
  const stageRef=useRef<HTMLDivElement|null>(null);
  const audioRef=useRef<HTMLDivElement|null>(null);
  const publicationsRef=useRef<Map<Source,PubState>>(new Map());
  const subscriptionsRef=useRef<Map<string,RTCPeerConnection>>(new Map());
  const disposedRef=useRef(false);
  const userIdRef=useRef("");
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [participants,setParticipants]=useState(1);
  const [userId,setUserId]=useState("");
  const [micOn,setMicOn]=useState(false);
  const [cameraOn,setCameraOn]=useState(false);
  const [screenOn,setScreenOn]=useState(false);
  const [stageHasVideo,setStageHasVideo]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const isModerator=access.role==="moderator";

  async function api(payload:any){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token)throw new Error("Session Vydys expirée");
    const res=await fetch("/api/live/cloudflare",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        authorization:"Bearer "+session.access_token
      },
      body:JSON.stringify({classroom_session_id:access.session_id,...payload})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data?.error||"Erreur Vydys Live");
    return data;
  }

  function refreshVideoPriority(){
    const host=stageRef.current;if(!host)return;
    const videos=Array.from(host.querySelectorAll("video[data-remote='1']")) as HTMLVideoElement[];
    const hasScreen=videos.some(v=>v.dataset.source==="screen");
    videos.forEach(v=>{v.style.display=hasScreen?(v.dataset.source==="screen"?"block":"none"):"block"});
  }

  function attachRemoteTrack(track:MediaStreamTrack,source:Source,publicationId:string){
    if(track.kind==="audio"){
      if(!audioRef.current)return;
      const audio=document.createElement("audio");
      audio.autoplay=true;
      audio.dataset.publicationId=publicationId;
      audio.srcObject=new MediaStream([track]);
      audioRef.current.appendChild(audio);
      track.addEventListener("ended",()=>audio.remove(),{once:true});
      return;
    }

    if(!stageRef.current)return;
    const video=document.createElement("video");
    video.autoplay=true;
    video.playsInline=true;
    video.dataset.remote="1";
    video.dataset.source=source;
    video.dataset.publicationId=publicationId;
    video.className="vydys-live-main-video";
    video.srcObject=new MediaStream([track]);
    stageRef.current.appendChild(video);
    refreshVideoPriority();
    track.addEventListener("ended",()=>{video.remove();refreshVideoPriority()},{once:true});
  }

  async function createProviderSession(){
    const data=await api({action:"create_session"});
    if(!data?.session_id)throw new Error("Impossible de créer la session vidéo");
    return String(data.session_id);
  }

  async function publishSource(source:Source){
    if(publicationsRef.current.has(source))return;
    if(!isModerator&&source!=="microphone")throw new Error("La caméra étudiant est désactivée");

    let stream:MediaStream;
    if(source==="microphone"){
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
    }else if(source==="camera"){
      stream=await navigator.mediaDevices.getUserMedia({
        audio:false,
        video:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}
      });
    }else{
      stream=await navigator.mediaDevices.getDisplayMedia({
        audio:false,
        video:{frameRate:{ideal:15,max:20}}
      });
    }

    const track=source==="microphone"?stream.getAudioTracks()[0]:stream.getVideoTracks()[0];
    if(!track){stream.getTracks().forEach(t=>t.stop());throw new Error("Piste média introuvable")}

    const pc=new RTCPeerConnection(rtcConfig);
    const transceiver=pc.addTransceiver(track,{direction:"sendonly"});
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    const mid=transceiver.mid;
    if(mid===null){pc.close();stream.getTracks().forEach(t=>t.stop());throw new Error("Négociation WebRTC incomplète")}

    const providerSessionId=await createProviderSession();
    const trackName=source+"-"+crypto.randomUUID();
    const response=await api({
      action:"publish",
      provider_session_id:providerSessionId,
      session_description:pc.localDescription,
      track:{
        source,
        kind:track.kind,
        track_name:trackName,
        mid
      }
    });

    if(response?.sessionDescription)await pc.setRemoteDescription(response.sessionDescription);

    const {data:row,error:insertError}=await supabase.from("classroom_live_publications").insert({
      classroom_session_id:access.session_id,
      user_id:userId,
      provider_session_id:providerSessionId,
      track_name:trackName,
      kind:track.kind,
      source,
      active:true
    }).select("id").single();

    if(insertError||!row){
      pc.close();stream.getTracks().forEach(t=>t.stop());
      throw new Error(insertError?.message||"Impossible d’enregistrer la piste");
    }

    publicationsRef.current.set(source,{pc,stream,publicationId:row.id,providerSessionId});

    if(isModerator&&source!=="microphone"&&stageRef.current){
      stageRef.current.querySelectorAll("video[data-local='1']").forEach(v=>v.remove());
      const video=document.createElement("video");
      video.autoplay=true;video.muted=true;video.playsInline=true;
      video.dataset.local="1";video.dataset.source=source;
      video.className="vydys-live-main-video";
      video.srcObject=stream;
      stageRef.current.prepend(video);
      setStageHasVideo(true);
    }

    track.addEventListener("ended",()=>{void stopSource(source)},{once:true});
  }

  async function stopSource(source:Source){
    const state=publicationsRef.current.get(source);
    if(!state)return;
    publicationsRef.current.delete(source);
    try{await supabase.from("classroom_live_publications").update({active:false,updated_at:new Date().toISOString()}).eq("id",state.publicationId)}catch{}
    state.stream.getTracks().forEach(t=>t.stop());
    try{state.pc.close()}catch{}
    if(source!=="microphone"){
      stageRef.current?.querySelectorAll(`video[data-local='1'][data-source='${source}']`).forEach(v=>v.remove());
      const remaining=stageRef.current?.querySelectorAll("video").length||0;
      if(remaining===0)setStageHasVideo(false);
    }
    if(source==="microphone")setMicOn(false);
    if(source==="camera")setCameraOn(false);
    if(source==="screen")setScreenOn(false);
  }

  async function subscribePublication(pub:any){
    const currentUserId=userIdRef.current;
    if(subscriptionsRef.current.has(pub.id)||pub.user_id===currentUserId)return;

    const pc=new RTCPeerConnection(rtcConfig);
    subscriptionsRef.current.set(pub.id,pc);
    pc.addEventListener("track",event=>{
      attachRemoteTrack(event.track,pub.source as Source,pub.id);
    });

    try{
      const providerSessionId=await createProviderSession();
      const response=await api({
        action:"subscribe",
        provider_session_id:providerSessionId,
        publication_id:pub.id
      });
      if(!response?.sessionDescription)throw new Error("Offre distante absente");
      await pc.setRemoteDescription(response.sessionDescription);
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);
      await api({
        action:"renegotiate",
        provider_session_id:providerSessionId,
        session_description:pc.localDescription
      });
    }catch(e){
      subscriptionsRef.current.delete(pub.id);
      try{pc.close()}catch{}
      throw e;
    }
  }

  async function poll(){
    const currentUserId=userIdRef.current;
    if(disposedRef.current||!currentUserId)return;
    const [{data:pubs},{data:att}]=await Promise.all([
      supabase.from("classroom_live_publications")
        .select("id,user_id,provider_session_id,track_name,kind,source,active")
        .eq("classroom_session_id",access.session_id)
        .eq("active",true),
      supabase.from("classroom_attendance")
        .select("user_id")
        .eq("session_id",access.session_id)
    ]);
    const rows=pubs||[];
    const ids=new Set((att||[]).map((x:any)=>x.user_id));
    if(currentUserId)ids.add(currentUserId);
    setParticipants(Math.max(1,ids.size));

    for(const pub of rows){
      if(pub.user_id===currentUserId||subscriptionsRef.current.has(pub.id))continue;
      try{await subscribePublication(pub)}catch{}
    }

    const activeIds=new Set(rows.map((x:any)=>x.id));
    for(const [id,pc] of subscriptionsRef.current){
      if(!activeIds.has(id)){
        try{pc.close()}catch{}
        subscriptionsRef.current.delete(id);
        stageRef.current?.querySelectorAll(`[data-publication-id='${id}']`).forEach(el=>el.remove());
        audioRef.current?.querySelectorAll(`[data-publication-id='${id}']`).forEach(el=>el.remove());
        refreshVideoPriority();
        const remaining=stageRef.current?.querySelectorAll("video").length||0;
        if(remaining===0)setStageHasVideo(false);
      }
    }
  }

  useEffect(()=>{
    disposedRef.current=false;
    let timer:any=null;
    let heartbeat:any=null;

    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){setStatus("error");setError("Connexion Vydys requise");return}
      userIdRef.current=user.id;
      setUserId(user.id);
      setStatus("ready");
      try{await supabase.rpc("mark_classroom_attendance",{p_session_id:access.session_id,p_event:"join"})}catch{}
      heartbeat=setInterval(()=>{supabase.rpc("mark_classroom_attendance",{p_session_id:access.session_id,p_event:"heartbeat"}).then(()=>{})},60000);
      timer=setInterval(()=>{void poll()},2500);
    })();

    return()=>{
      disposedRef.current=true;
      if(timer)clearInterval(timer);
      if(heartbeat)clearInterval(heartbeat);
      supabase.rpc("mark_classroom_attendance",{p_session_id:access.session_id,p_event:"leave"}).then(()=>{});
      publicationsRef.current.forEach(state=>{
        supabase.from("classroom_live_publications").update({active:false,updated_at:new Date().toISOString()}).eq("id",state.publicationId).then(()=>{});
        state.stream.getTracks().forEach(t=>t.stop());
        try{state.pc.close()}catch{}
      });
      publicationsRef.current.clear();
      userIdRef.current="";
      subscriptionsRef.current.forEach(pc=>{try{pc.close()}catch{}});
      subscriptionsRef.current.clear();
    };
  },[access.session_id]);

  useEffect(()=>{
    if(userId)void poll();
  },[userId]);

  async function toggle(source:Source){
    setBusy(true);setError("");
    try{
      if(publicationsRef.current.has(source))await stopSource(source);
      else await publishSource(source);
      if(source==="microphone")setMicOn(publicationsRef.current.has(source));
      if(source==="camera")setCameraOn(publicationsRef.current.has(source));
      if(source==="screen")setScreenOn(publicationsRef.current.has(source));
      await poll();
    }catch(e:any){setError(e?.message||"Erreur média")}
    finally{setBusy(false)}
  }

  return <div className="vydys-live-video-shell">
    <div className="vydys-live-video-top">
      <div><span className={"live-dot "+status}></span><strong>Vydys Live Lite</strong><small>{isModerator?"Formateur / Modérateur":"Étudiant"} · Cloudflare SFU</small></div>
      <div className="live-participant-count">● {participants} live</div>
    </div>

    <div ref={stageRef} className="vydys-lite-stage">
      {status==="loading"&&<div className="video-loading"><span>V</span><strong>Vydys Live Lite</strong><small>Connexion à la salle…</small></div>}
      {status==="ready"&&!stageHasVideo&&<div className="video-loading vydys-stage-placeholder"><span>V</span><strong>{isModerator?"Ouvrez votre caméra ou partagez votre écran":"En attente de la vidéo du formateur"}</strong><small>{isModerator?"Les étudiants ne peuvent pas publier de caméra.":"Vous pouvez écouter, regarder et utiliser votre micro."}</small></div>}
      {status==="error"&&<div className="video-loading error"><span>!</span><strong>Vydys Live indisponible</strong><small>{error||"Réessayez dans quelques instants."}</small></div>}
    </div>
    <div ref={audioRef} className="vydys-live-audio-host"/>

    <div className="vydys-lite-controls">
      <button type="button" disabled={busy||status!=="ready"} onClick={()=>toggle("microphone")} className={micOn?"active":""}>{micOn?"Couper le micro":"Ouvrir le micro"}</button>
      {isModerator&&<button type="button" disabled={busy||status!=="ready"} onClick={()=>toggle("camera")} className={cameraOn?"active":""}>{cameraOn?"Fermer la caméra":"Ouvrir la caméra"}</button>}
      {isModerator&&<button type="button" disabled={busy||status!=="ready"} onClick={()=>toggle("screen")} className={screenOn?"active":""}>{screenOn?"Arrêter le partage":"Partager l’écran"}</button>}
    </div>

    {error&&status!=="error"&&<div className="vydys-live-fallback-note">{error}</div>}
    {!isModerator&&<div className="vydys-lite-rule">Mode étudiant : caméra interdite · microphone autorisé · vidéo/audio du formateur en réception.</div>}
  </div>
}
