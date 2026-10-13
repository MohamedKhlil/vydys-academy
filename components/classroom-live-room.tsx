"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Source="microphone"|"camera"|"screen";
type MediaState="off"|"requesting"|"connecting"|"live"|"error";
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

function waitForIce(pc:RTCPeerConnection,timeoutMs=8000){
  if(pc.iceGatheringState==="complete")return Promise.resolve();
  return new Promise<void>(resolve=>{
    let done=false;
    const finish=()=>{
      if(done)return;
      done=true;
      pc.removeEventListener("icegatheringstatechange",onChange);
      resolve();
    };
    const onChange=()=>{if(pc.iceGatheringState==="complete")finish()};
    pc.addEventListener("icegatheringstatechange",onChange);
    setTimeout(finish,timeoutMs);
  });
}

function waitForConnected(pc:RTCPeerConnection,timeoutMs=12000){
  if(pc.connectionState==="connected"||pc.iceConnectionState==="connected"||pc.iceConnectionState==="completed")return Promise.resolve();
  return new Promise<void>((resolve,reject)=>{
    let done=false;
    const cleanup=()=>{
      pc.removeEventListener("connectionstatechange",check);
      pc.removeEventListener("iceconnectionstatechange",check);
    };
    const finish=(err?:Error)=>{
      if(done)return;
      done=true;
      cleanup();
      err?reject(err):resolve();
    };
    const check=()=>{
      if(pc.connectionState==="connected"||pc.iceConnectionState==="connected"||pc.iceConnectionState==="completed")finish();
      else if(pc.connectionState==="failed"||pc.connectionState==="closed"||pc.iceConnectionState==="failed")finish(new Error("La connexion WebRTC a échoué."));
    };
    pc.addEventListener("connectionstatechange",check);
    pc.addEventListener("iceconnectionstatechange",check);
    setTimeout(()=>finish(new Error("Délai de connexion dépassé. Vérifiez le réseau ou réessayez.")),timeoutMs);
  });
}

function mediaErrorMessage(error:any,source:Source){
  const name=String(error?.name||"");
  if(name==="NotAllowedError"||name==="SecurityError"){
    return source==="camera"
      ?"Autorisez l’accès à la caméra dans votre navigateur puis réessayez."
      :"Autorisez l’accès au microphone dans votre navigateur puis réessayez.";
  }
  if(name==="NotFoundError"||name==="DevicesNotFoundError"){
    return source==="camera"?"Aucune caméra détectée sur cet appareil.":"Aucun microphone détecté sur cet appareil.";
  }
  if(name==="NotReadableError"||name==="TrackStartError"){
    return source==="camera"?"La caméra est déjà utilisée par une autre application.":"Le microphone est déjà utilisé par une autre application.";
  }
  if(name==="AbortError")return "Le périphérique média n’a pas pu démarrer. Réessayez.";
  return String(error?.message||"Impossible d’activer le média.");
}

export default function ClassroomLiveRoom({access}:{access:any}){
  const stageRef=useRef<HTMLDivElement|null>(null);
  const audioRef=useRef<HTMLDivElement|null>(null);
  const publicationsRef=useRef<Map<Source,PubState>>(new Map());
  const subscriptionsRef=useRef<Map<string,RTCPeerConnection>>(new Map());
  const disposedRef=useRef(false);
  const userIdRef=useRef("");
  const pollBusyRef=useRef(false);

  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [participants,setParticipants]=useState(1);
  const [stageHasVideo,setStageHasVideo]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [mediaState,setMediaState]=useState<Record<Source,MediaState>>({
    microphone:"off",camera:"off",screen:"off"
  });

  const isModerator=access.role==="moderator";

  async function api(payload:any){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token)throw new Error("Votre session Vydys a expiré. Reconnectez-vous.");
    const res=await fetch("/api/live/cloudflare",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        authorization:"Bearer "+session.access_token
      },
      body:JSON.stringify({classroom_session_id:access.session_id,...payload})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data?.error||"Erreur de connexion Vydys Live.");
    return data;
  }

  function updateMediaState(source:Source,next:MediaState){
    setMediaState(prev=>({...prev,[source]:next}));
  }

  function refreshVideoPriority(){
    const host=stageRef.current;if(!host)return;
    const videos=Array.from(host.querySelectorAll("video")) as HTMLVideoElement[];
    const hasScreen=videos.some(v=>v.dataset.source==="screen");
    videos.forEach(v=>{
      if(v.dataset.local==="1"&&hasScreen&&v.dataset.source!=="screen")v.style.display="none";
      else if(v.dataset.remote==="1"&&hasScreen&&v.dataset.source!=="screen")v.style.display="none";
      else v.style.display="block";
    });
    setStageHasVideo(videos.length>0);
  }

  function attachLocalPreview(stream:MediaStream,source:Source){
    if(source==="microphone"||!stageRef.current)return;
    stageRef.current.querySelectorAll(`video[data-local='1'][data-source='${source}']`).forEach(v=>v.remove());
    const video=document.createElement("video");
    video.autoplay=true;
    video.muted=true;
    video.playsInline=true;
    video.dataset.local="1";
    video.dataset.source=source;
    video.className="vydys-live-main-video";
    video.srcObject=stream;
    stageRef.current.prepend(video);
    refreshVideoPriority();
  }

  function attachRemoteTrack(track:MediaStreamTrack,source:Source,publicationId:string){
    if(track.kind==="audio"){
      if(!audioRef.current)return;
      const audio=document.createElement("audio");
      audio.autoplay=true;
      audio.dataset.publicationId=publicationId;
      audio.srcObject=new MediaStream([track]);
      audioRef.current.appendChild(audio);
      audio.play().catch(()=>{});
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
    video.play().catch(()=>{});
    refreshVideoPriority();
    track.addEventListener("ended",()=>{video.remove();refreshVideoPriority()},{once:true});
  }

  async function createProviderSession(){
    const data=await api({action:"create_session"});
    if(!data?.session_id)throw new Error("Cloudflare n’a pas créé la session média.");
    return String(data.session_id);
  }

  async function capture(source:Source){
    if(!navigator.mediaDevices)throw new Error("Ce navigateur ne prend pas en charge la caméra et le microphone.");
    if(source==="microphone"){
      return navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
        video:false
      });
    }
    if(source==="camera"){
      return navigator.mediaDevices.getUserMedia({
        audio:false,
        video:{
          width:{ideal:1280,max:1280},
          height:{ideal:720,max:720},
          frameRate:{ideal:24,max:30}
        }
      });
    }
    return navigator.mediaDevices.getDisplayMedia({
      audio:false,
      video:{frameRate:{ideal:15,max:20}}
    });
  }

  async function publishSource(source:Source){
    if(publicationsRef.current.has(source))return;
    if(!isModerator&&source!=="microphone")throw new Error("La caméra étudiant est désactivée par Vydys.");

    updateMediaState(source,"requesting");
    let stream:MediaStream|null=null;
    let pc:RTCPeerConnection|null=null;

    try{
      stream=await capture(source);
      if(source!=="microphone")attachLocalPreview(stream,source);
      updateMediaState(source,"connecting");

      const track=source==="microphone"?stream.getAudioTracks()[0]:stream.getVideoTracks()[0];
      if(!track)throw new Error("Le périphérique n’a fourni aucune piste média.");

      pc=new RTCPeerConnection(rtcConfig);
      const transceiver=pc.addTransceiver(track,{direction:"sendonly"});
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);

      const mid=transceiver.mid;
      if(mid===null)throw new Error("La négociation WebRTC n’a pas attribué de piste.");

      const providerSessionId=await createProviderSession();
      const trackName=source+"-"+crypto.randomUUID();
      const response=await api({
        action:"publish",
        provider_session_id:providerSessionId,
        session_description:pc.localDescription,
        track:{source,kind:track.kind,track_name:trackName,mid}
      });

      if(!response?.sessionDescription)throw new Error("Cloudflare n’a pas renvoyé de réponse SDP.");
      await pc.setRemoteDescription(response.sessionDescription);
      await waitForConnected(pc);

      const currentUserId=userIdRef.current;
      if(!currentUserId)throw new Error("Identité Vydys indisponible.");

      const {data:row,error:insertError}=await supabase.from("classroom_live_publications").insert({
        classroom_session_id:access.session_id,
        user_id:currentUserId,
        provider_session_id:providerSessionId,
        track_name:trackName,
        kind:track.kind,
        source,
        active:true
      }).select("id").single();

      if(insertError||!row)throw new Error(insertError?.message||"Impossible d’enregistrer la piste Vydys.");

      publicationsRef.current.set(source,{pc,stream,publicationId:row.id,providerSessionId});
      updateMediaState(source,"live");
      setError("");

      track.addEventListener("ended",()=>{void stopSource(source)},{once:true});
    }catch(e:any){
      updateMediaState(source,"error");
      if(stream)stream.getTracks().forEach(t=>t.stop());
      if(pc)try{pc.close()}catch{}
      if(source!=="microphone"){
        stageRef.current?.querySelectorAll(`video[data-local='1'][data-source='${source}']`).forEach(v=>v.remove());
        refreshVideoPriority();
      }
      throw new Error(mediaErrorMessage(e,source));
    }
  }

  async function stopSource(source:Source){
    const state=publicationsRef.current.get(source);
    publicationsRef.current.delete(source);
    updateMediaState(source,"off");

    if(state){
      try{
        await supabase.from("classroom_live_publications")
          .update({active:false,updated_at:new Date().toISOString()})
          .eq("id",state.publicationId);
      }catch{}
      state.stream.getTracks().forEach(t=>t.stop());
      try{state.pc.close()}catch{}
    }

    if(source!=="microphone"){
      stageRef.current?.querySelectorAll(`video[data-local='1'][data-source='${source}']`).forEach(v=>v.remove());
      refreshVideoPriority();
    }
  }

  async function subscribePublication(pub:any){
    const currentUserId=userIdRef.current;
    if(subscriptionsRef.current.has(pub.id)||pub.user_id===currentUserId)return;

    const pc=new RTCPeerConnection(rtcConfig);
    subscriptionsRef.current.set(pub.id,pc);
    pc.addEventListener("track",event=>attachRemoteTrack(event.track,pub.source as Source,pub.id));

    try{
      const providerSessionId=await createProviderSession();
      const response=await api({
        action:"subscribe",
        provider_session_id:providerSessionId,
        publication_id:pub.id
      });

      if(!response?.sessionDescription)throw new Error("Offre distante absente.");
      await pc.setRemoteDescription(response.sessionDescription);
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);

      await api({
        action:"renegotiate",
        provider_session_id:providerSessionId,
        session_description:pc.localDescription
      });
      await waitForConnected(pc);
    }catch(e){
      subscriptionsRef.current.delete(pub.id);
      try{pc.close()}catch{}
      throw e;
    }
  }

  async function poll(){
    const currentUserId=userIdRef.current;
    if(disposedRef.current||!currentUserId||pollBusyRef.current)return;
    pollBusyRef.current=true;
    try{
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
      ids.add(currentUserId);
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
        }
      }
    }finally{
      pollBusyRef.current=false;
    }
  }

  useEffect(()=>{
    disposedRef.current=false;
    let timer:any=null;
    let heartbeat:any=null;

    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){
        setStatus("error");
        setError("Connexion Vydys requise.");
        return;
      }

      userIdRef.current=user.id;
      setStatus("ready");
      try{await supabase.rpc("mark_classroom_attendance",{p_session_id:access.session_id,p_event:"join"})}catch{}
      await poll();

      heartbeat=setInterval(()=>{
        supabase.rpc("mark_classroom_attendance",{p_session_id:access.session_id,p_event:"heartbeat"}).then(()=>{});
      },60000);
      timer=setInterval(()=>{void poll()},3500);
    })();

    return()=>{
      disposedRef.current=true;
      if(timer)clearInterval(timer);
      if(heartbeat)clearInterval(heartbeat);
      supabase.rpc("mark_classroom_attendance",{p_session_id:access.session_id,p_event:"leave"}).then(()=>{});

      publicationsRef.current.forEach(state=>{
        supabase.from("classroom_live_publications")
          .update({active:false,updated_at:new Date().toISOString()})
          .eq("id",state.publicationId).then(()=>{});
        state.stream.getTracks().forEach(t=>t.stop());
        try{state.pc.close()}catch{}
      });
      publicationsRef.current.clear();
      subscriptionsRef.current.forEach(pc=>{try{pc.close()}catch{}});
      subscriptionsRef.current.clear();
      userIdRef.current="";
    };
  },[access.session_id]);

  useEffect(()=>{
    const channel=supabase.channel("classroom-live-publications-"+access.session_id)
      .on("postgres_changes",{
        event:"*",
        schema:"public",
        table:"classroom_live_publications",
        filter:`classroom_session_id=eq.${access.session_id}`
      },()=>{void poll()})
      .subscribe();

    return()=>{supabase.removeChannel(channel)};
  },[access.session_id]);

  async function toggle(source:Source){
    if(busy)return;
    setBusy(true);
    setError("");
    try{
      if(publicationsRef.current.has(source))await stopSource(source);
      else await publishSource(source);
      await poll();
    }catch(e:any){
      setError(e?.message||"Erreur média.");
    }finally{
      setBusy(false);
    }
  }

  const sourceLabel=(source:Source)=>{
    const state=mediaState[source];
    if(state==="requesting")return "Autorisation…";
    if(state==="connecting")return "Connexion…";
    if(state==="live")return source==="microphone"?"Micro actif":source==="camera"?"Caméra active":"Écran partagé";
    if(state==="error")return "Réessayer";
    return source==="microphone"?"Ouvrir le micro":source==="camera"?"Ouvrir la caméra":"Partager l’écran";
  };

  return <div className="vydys-live-video-shell vydys-live-lite-shell">
    <div className="vydys-live-video-top">
      <div>
        <span className={"live-dot "+status}></span>
        <strong>Vydys Live Lite</strong>
        <small>{isModerator?"Mode Formateur / Modérateur":"Mode Étudiant"} · Cloudflare SFU</small>
      </div>
      <div className="live-participant-count">● {participants} live</div>
    </div>

    <div className="vydys-live-role-banner">
      <strong>{isModerator?"Formateur : caméra, micro et partage d’écran autorisés":"Étudiant : micro autorisé · caméra désactivée"}</strong>
      <span>{isModerator?"Les étudiants regardent votre vidéo et peuvent prendre la parole avec leur micro.":"Vous recevez la vidéo et l’audio du formateur."}</span>
    </div>

    <div ref={stageRef} className="vydys-lite-stage">
      {status==="loading"&&<div className="video-loading"><span>V</span><strong>Vydys Live Lite</strong><small>Connexion à la salle…</small></div>}
      {status==="ready"&&!stageHasVideo&&<div className="vydys-stage-empty"><span>V</span><strong>{isModerator?"Prêt à diffuser":"En attente du formateur"}</strong><small>{isModerator?"Utilisez les boutons ci-dessous pour activer caméra, micro ou partage d’écran.":"La vidéo apparaîtra ici dès que le formateur commencera."}</small></div>}
      {status==="error"&&<div className="video-loading error"><span>!</span><strong>Vydys Live indisponible</strong><small>{error||"Réessayez dans quelques instants."}</small></div>}
    </div>
    <div ref={audioRef} className="vydys-live-audio-host"/>

    <div className="vydys-lite-controls">
      <button type="button" disabled={busy||status!=="ready"} onClick={()=>toggle("microphone")} className={mediaState.microphone==="live"?"active":mediaState.microphone==="error"?"error":""}>
        <span>🎙</span>{sourceLabel("microphone")}
      </button>
      {isModerator&&<button type="button" disabled={busy||status!=="ready"} onClick={()=>toggle("camera")} className={mediaState.camera==="live"?"active":mediaState.camera==="error"?"error":""}>
        <span>◉</span>{sourceLabel("camera")}
      </button>}
      {isModerator&&<button type="button" disabled={busy||status!=="ready"} onClick={()=>toggle("screen")} className={mediaState.screen==="live"?"active":mediaState.screen==="error"?"error":""}>
        <span>▣</span>{sourceLabel("screen")}
      </button>}
    </div>

    {error&&status!=="error"&&<div className="vydys-live-error-box"><strong>Connexion média</strong><span>{error}</span><small>Si le navigateur a bloqué la caméra ou le micro, cliquez sur l’icône de permissions près de l’adresse vydys.com puis autorisez l’accès.</small></div>}
  </div>
}
