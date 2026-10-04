"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

declare global{
  interface Window{JitsiMeetExternalAPI?:any}
}

export default function ClassroomLiveRoom({access}:{access:any}){
  const hostRef=useRef<HTMLDivElement|null>(null);
  const apiRef=useRef<any>(null);
  const joinedRef=useRef(false);
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [participants,setParticipants]=useState(0);

  useEffect(()=>{
    let disposed=false;
    let heartbeat:any=null;

    async function attendance(event:"join"|"heartbeat"|"leave"){
      try{await supabase.rpc("mark_classroom_attendance",{p_session_id:access.session_id,p_event:event})}catch{}
    }

    function boot(){
      if(disposed||!hostRef.current||!window.JitsiMeetExternalAPI)return;
      try{
        const api=new window.JitsiMeetExternalAPI("meet.jit.si",{
          roomName:access.room_name,
          parentNode:hostRef.current,
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
        apiRef.current=api;

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
        setTimeout(()=>{if(!disposed&&status==="loading")setStatus("ready")},3500);
      }catch{setStatus("error")}
    }

    if(window.JitsiMeetExternalAPI)boot();
    else{
      const existing=document.querySelector('script[data-vydys-jitsi="1"]') as HTMLScriptElement|null;
      if(existing){existing.addEventListener("load",boot,{once:true})}
      else{
        const script=document.createElement("script");
        script.src="https://meet.jit.si/external_api.js";
        script.async=true;
        script.dataset.vydysJitsi="1";
        script.onload=boot;
        script.onerror=()=>setStatus("error");
        document.head.appendChild(script);
      }
    }

    const leave=()=>{if(joinedRef.current)attendance("leave")};
    window.addEventListener("beforeunload",leave);

    return()=>{
      disposed=true;
      window.removeEventListener("beforeunload",leave);
      if(heartbeat)clearInterval(heartbeat);
      if(joinedRef.current)attendance("leave");
      try{apiRef.current?.dispose?.()}catch{}
      apiRef.current=null;
    }
  },[access.session_id,access.room_name,access.display_name]);

  return <div className="vydys-live-video-shell">
    <div className="vydys-live-video-top"><div><span className={"live-dot "+status}></span><strong>Vydys Live</strong><small>{access.role==="moderator"?"Instructor / Moderator":"Learner"}</small></div><div className="live-participant-count">● {participants} live</div></div>
    <div ref={hostRef} className="vydys-jitsi-host">
      {status==="loading"&&<div className="video-loading"><span>V</span><strong>Vydys Classroom</strong><small>Connecting secure live room…</small></div>}
      {status==="error"&&<div className="video-loading error"><span>!</span><strong>Live room unavailable</strong><small>Check your connection and try again.</small></div>}
    </div>
  </div>
}
