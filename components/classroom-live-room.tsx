"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { supabase } from "../lib/supabase";

declare global{
  interface Window{JitsiMeetExternalAPI?:any}
}

type Engine="loading"|"livekit"|"jitsi"|"error";

export default function ClassroomLiveRoom({access}:{access:any}){
  const videoHostRef=useRef<HTMLDivElement|null>(null);
  const audioHostRef=useRef<HTMLDivElement|null>(null);
  const jitsiHostRef=useRef<HTMLDivElement|null>(null);
  const livekitRoomRef=useRef<Room|null>(null);
  const jitsiApiRef=useRef<any>(null);
  const joinedRef=useRef(false);
  const [engine,setEngine]=useState<Engine>("loading");
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [participants,setParticipants]=useState(0);
  const [micOn,setMicOn]=useState(false);
  const [cameraOn,setCameraOn]=useState(false);
  const [screenOn,setScreenOn]=useState(false);
  const [controlBusy,setControlBusy]=useState(false);

  const isModerator=access.role==="moderator";

  useEffect(()=>{
    let disposed=false;
    let heartbeat:any=null;

    async function attendance(event:"join"|"heartbeat"|"leave"){
      try{await supabase.rpc("mark_classroom_attendance",{p_session_id:access.session_id,p_event:event})}catch{}
    }

    function updateCount(room?:Room){
      if(room)setParticipants(room.remoteParticipants.size+1);
    }

    function clearVideo(){
      if(!videoHostRef.current)return;
      videoHostRef.current.querySelectorAll("video").forEach(el=>el.remove());
    }

    function attachVideo(track:any){
      if(!videoHostRef.current)return;
      clearVideo();
      const el=track.attach();
      el.autoplay=true;
      el.playsInline=true;
      el.className="vydys-live-main-video";
      videoHostRef.current.appendChild(el);
    }

    function attachAudio(track:any){
      if(!audioHostRef.current)return;
      const el=track.attach();
      el.autoplay=true;
      audioHostRef.current.appendChild(el);
    }

    async function bootLiveKit(config:{url:string;token:string}){
      try{
        const room=new Room({adaptiveStream:true,dynacast:true});
        livekitRoomRef.current=room;

        room.on(RoomEvent.TrackSubscribed,(track:any)=>{
          if(track.kind===Track.Kind.Video)attachVideo(track);
          else if(track.kind===Track.Kind.Audio)attachAudio(track);
        });
        room.on(RoomEvent.TrackUnsubscribed,(track:any)=>{
          try{track.detach().forEach((el:HTMLElement)=>el.remove())}catch{}
        });
        room.on(RoomEvent.ParticipantConnected,()=>updateCount(room));
        room.on(RoomEvent.ParticipantDisconnected,()=>updateCount(room));
        room.on(RoomEvent.Connected,async()=>{
          if(disposed)return;
          joinedRef.current=true;
          setStatus("ready");
          updateCount(room);
          await attendance("join");
          heartbeat=setInterval(()=>attendance("heartbeat"),60000);
        });
        room.on(RoomEvent.Disconnected,async()=>{
          if(joinedRef.current){
            joinedRef.current=false;
            await attendance("leave");
          }
        });

        await room.connect(config.url,config.token,{autoSubscribe:true});
        if(disposed){room.disconnect();return}
        setEngine("livekit");
      }catch(err){
        console.error("Vydys Live Lite connection failed",err);
        if(!disposed){setEngine("error");setStatus("error")}
      }
    }

    function bootJitsi(){
      setEngine("jitsi");
      function boot(){
        if(disposed||!jitsiHostRef.current||!window.JitsiMeetExternalAPI)return;
        try{
          const api=new window.JitsiMeetExternalAPI("meet.jit.si",{
            roomName:access.room_name,
            parentNode:jitsiHostRef.current,
            width:"100%",
            height:"100%",
            userInfo:{displayName:access.display_name},
            configOverwrite:{
              prejoinPageEnabled:false,
              startWithAudioMuted:true,
              startWithVideoMuted:true,
              disableDeepLinking:true,
              enableWelcomePage:false
            },
            interfaceConfigOverwrite:{
              MOBILE_APP_PROMO:false,
              SHOW_JITSI_WATERMARK:false,
              SHOW_WATERMARK_FOR_GUESTS:false
            }
          });
          jitsiApiRef.current=api;
          api.addEventListener("videoConferenceJoined",async()=>{
            joinedRef.current=true;setStatus("ready");
            await attendance("join");
            try{setParticipants(Number(api.getNumberOfParticipants?.()||1))}catch{}
            heartbeat=setInterval(()=>attendance("heartbeat"),60000);
          });
          api.addEventListener("videoConferenceLeft",async()=>{
            if(joinedRef.current){joinedRef.current=false;await attendance("leave")}
          });
          api.addEventListener("participantJoined",()=>{try{setParticipants(Number(api.getNumberOfParticipants?.()||0))}catch{}});
          api.addEventListener("participantLeft",()=>{try{setParticipants(Number(api.getNumberOfParticipants?.()||0))}catch{}});
          setTimeout(()=>{if(!disposed)setStatus("ready")},3000);
        }catch{setStatus("error");setEngine("error")}
      }

      if(window.JitsiMeetExternalAPI)boot();
      else{
        const existing=document.querySelector('script[data-vydys-jitsi="1"]') as HTMLScriptElement|null;
        if(existing)existing.addEventListener("load",boot,{once:true});
        else{
          const script=document.createElement("script");
          script.src="https://meet.jit.si/external_api.js";
          script.async=true;
          script.dataset.vydysJitsi="1";
          script.onload=boot;
          script.onerror=()=>{setStatus("error");setEngine("error")};
          document.head.appendChild(script);
        }
      }
    }

    async function start(){
      try{
        const {data:{session}}=await supabase.auth.getSession();
        const token=session?.access_token;
        if(!token){setEngine("error");setStatus("error");return}
        const res=await fetch("/api/live/token",{
          method:"POST",
          headers:{"content-type":"application/json",authorization:"Bearer "+token},
          body:JSON.stringify({session_id:access.session_id})
        });
        if(res.ok){
          const data=await res.json();
          if(data?.enabled&&data?.url&&data?.token){await bootLiveKit(data);return}
        }
        if(!disposed)bootJitsi();
      }catch{
        if(!disposed)bootJitsi();
      }
    }

    start();

    const leave=()=>{if(joinedRef.current)attendance("leave")};
    window.addEventListener("beforeunload",leave);

    return()=>{
      disposed=true;
      window.removeEventListener("beforeunload",leave);
      if(heartbeat)clearInterval(heartbeat);
      if(joinedRef.current)attendance("leave");
      joinedRef.current=false;
      try{livekitRoomRef.current?.disconnect()}catch{}
      livekitRoomRef.current=null;
      try{jitsiApiRef.current?.dispose?.()}catch{}
      jitsiApiRef.current=null;
      clearVideo();
      if(audioHostRef.current)audioHostRef.current.innerHTML="";
    };
  },[access.session_id,access.room_name,access.display_name,access.role]);

  async function toggleMic(){
    const room=livekitRoomRef.current;if(!room)return;
    setControlBusy(true);
    try{
      const next=!micOn;
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
    }finally{setControlBusy(false)}
  }

  async function toggleCamera(){
    if(!isModerator)return;
    const room=livekitRoomRef.current;if(!room)return;
    setControlBusy(true);
    try{
      const next=!cameraOn;
      await room.localParticipant.setCameraEnabled(next);
      setCameraOn(next);
      const publication=room.localParticipant.getTrackPublication(Track.Source.Camera);
      const track=publication?.track as any;
      if(next&&track&&videoHostRef.current){
        videoHostRef.current.querySelectorAll("video").forEach(el=>el.remove());
        const el=track.attach();el.autoplay=true;el.muted=true;el.playsInline=true;el.className="vydys-live-main-video";
        videoHostRef.current.appendChild(el);
      }
    }finally{setControlBusy(false)}
  }

  async function toggleScreen(){
    if(!isModerator)return;
    const room=livekitRoomRef.current;if(!room)return;
    setControlBusy(true);
    try{
      const next=!screenOn;
      await room.localParticipant.setScreenShareEnabled(next);
      setScreenOn(next);
      if(next){
        const publication=room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        const track=publication?.track as any;
        if(track&&videoHostRef.current){
          videoHostRef.current.querySelectorAll("video").forEach(el=>el.remove());
          const el=track.attach();el.autoplay=true;el.muted=true;el.playsInline=true;el.className="vydys-live-main-video";
          videoHostRef.current.appendChild(el);
        }
      }
    }finally{setControlBusy(false)}
  }

  return <div className="vydys-live-video-shell">
    <div className="vydys-live-video-top">
      <div><span className={"live-dot "+status}></span><strong>{engine==="livekit"?"Vydys Live Lite":"Vydys Live"}</strong><small>{isModerator?"Instructor / Moderator":"Learner"} · {engine==="livekit"?"SFU":"fallback"}</small></div>
      <div className="live-participant-count">● {participants} live</div>
    </div>

    {engine==="livekit"&&<>
      <div ref={videoHostRef} className="vydys-lite-stage">
        {status==="loading"&&<div className="video-loading"><span>V</span><strong>Vydys Live Lite</strong><small>Connexion à la salle sécurisée…</small></div>}
        {status==="ready"&&participants<=1&&!cameraOn&&<div className="video-loading"><span>V</span><strong>{isModerator?"Vous pouvez ouvrir votre caméra.":"En attente du formateur…"}</strong><small>{isModerator?"Les étudiants ne peuvent publier que leur microphone.":"Votre caméra est désactivée par la plateforme."}</small></div>}
      </div>
      <div ref={audioHostRef} className="vydys-live-audio-host"/>
      <div className="vydys-lite-controls">
        <button type="button" onClick={toggleMic} disabled={controlBusy} className={micOn?"active":""}>{micOn?"Couper le micro":"Ouvrir le micro"}</button>
        {isModerator&&<button type="button" onClick={toggleCamera} disabled={controlBusy} className={cameraOn?"active":""}>{cameraOn?"Fermer la caméra":"Ouvrir la caméra"}</button>}
        {isModerator&&<button type="button" onClick={toggleScreen} disabled={controlBusy} className={screenOn?"active":""}>{screenOn?"Arrêter le partage":"Partager l’écran"}</button>}
      </div>
      {!isModerator&&<div className="vydys-lite-rule">Mode étudiant : caméra bloquée · micro autorisé · réception vidéo/audio active</div>}
    </>}

    {engine==="jitsi"&&<>
      <div className="vydys-live-fallback-note">Mode de secours temporaire · serveur Vydys Live Lite non configuré</div>
      <div ref={jitsiHostRef} className="vydys-jitsi-host">
        {status==="loading"&&<div className="video-loading"><span>V</span><strong>Vydys Classroom</strong><small>Connecting temporary live room…</small></div>}
      </div>
    </>}

    {engine==="error"&&<div className="video-loading error"><span>!</span><strong>Live room unavailable</strong><small>Check your connection and try again.</small></div>}
  </div>
}
