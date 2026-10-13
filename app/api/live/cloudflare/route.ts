import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ruzwqmtqyvtpgccqonqi.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4hwMfwmOp1qI1-PB17K-_w_EpJf9ww6";
const CF_BASE = "https://rtc.live.cloudflare.com/v1";

function jsonError(message:string,status=400){
  return NextResponse.json({error:message},{status});
}

async function cf(path:string, init:RequestInit){
  const appId=process.env.REALTIME_SFU_APP_ID;
  const token=process.env.REALTIME_SFU_BEARER_TOKEN;
  if(!appId||!token)throw new Error("Cloudflare Realtime is not configured");
  const res=await fetch(`${CF_BASE}/apps/${appId}${path}`,{
    ...init,
    headers:{
      "authorization":`Bearer ${token}`,
      "content-type":"application/json",
      ...(init.headers||{})
    },
    cache:"no-store"
  });
  const text=await res.text();
  let data:any={};
  try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
  if(!res.ok){
    const msg=data?.errorDescription||data?.error||data?.message||`Cloudflare SFU error ${res.status}`;
    throw new Error(typeof msg==="string"?msg:JSON.stringify(msg));
  }
  return data;
}

export async function POST(req:NextRequest){
  const auth=req.headers.get("authorization")||"";
  const bearer=auth.startsWith("Bearer ")?auth.slice(7):"";
  if(!bearer)return jsonError("unauthorized",401);

  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:`Bearer ${bearer}`}}
  });
  const {data:{user},error:userError}=await supabase.auth.getUser(bearer);
  if(userError||!user)return jsonError("unauthorized",401);

  let body:any={};
  try{body=await req.json()}catch{return jsonError("invalid_json")}
  const action=String(body?.action||"");
  const classroomSessionId=String(body?.classroom_session_id||"");
  if(!classroomSessionId)return jsonError("missing_classroom_session_id");

  const {data:access,error:accessError}=await supabase.rpc("get_classroom_session_access",{p_session_id:classroomSessionId});
  if(accessError||!access)return jsonError(accessError?.message||"access_denied",403);

  try{
    if(action==="create_session"){
      const data=await cf("/sessions/new",{method:"POST"});
      return NextResponse.json({session_id:data.sessionId,role:access.role});
    }

    const providerSessionId=String(body?.provider_session_id||"");
    if(!providerSessionId)return jsonError("missing_provider_session_id");

    if(action==="publish"){
      const track=body?.track;
      const source=String(track?.source||"");
      const kind=String(track?.kind||"");
      const trackName=String(track?.track_name||"");
      const mid=String(track?.mid||"");
      const sessionDescription=body?.session_description;

      if(!trackName||!mid||!sessionDescription?.sdp)return jsonError("invalid_publish_request");
      if(access.role==="moderator"){
        if(!["microphone","camera","screen"].includes(source))return jsonError("source_not_allowed",403);
      }else{
        if(source!=="microphone")return jsonError("students_can_publish_microphone_only",403);
      }
      if(source==="microphone"&&kind!=="audio")return jsonError("invalid_microphone_kind");
      if((source==="camera"||source==="screen")&&kind!=="video")return jsonError("invalid_video_kind");

      const data=await cf(`/sessions/${encodeURIComponent(providerSessionId)}/tracks/new`,{
        method:"POST",
        body:JSON.stringify({
          sessionDescription,
          tracks:[{
            location:"local",
            trackName,
            mid
          }]
        })
      });
      return NextResponse.json(data);
    }

    if(action==="subscribe"){
      const publicationId=String(body?.publication_id||"");
      if(!publicationId)return jsonError("missing_publication_id");

      const {data:pub,error:pubError}=await supabase
        .from("classroom_live_publications")
        .select("id,classroom_session_id,provider_session_id,track_name,kind,source,active,user_id")
        .eq("id",publicationId)
        .eq("classroom_session_id",classroomSessionId)
        .eq("active",true)
        .maybeSingle();

      if(pubError||!pub)return jsonError("publication_not_found",404);
      if(pub.user_id===user.id)return jsonError("cannot_subscribe_to_self",400);

      const data=await cf(`/sessions/${encodeURIComponent(providerSessionId)}/tracks/new`,{
        method:"POST",
        body:JSON.stringify({
          tracks:[{
            location:"remote",
            sessionId:pub.provider_session_id,
            trackName:pub.track_name
          }]
        })
      });
      return NextResponse.json({...data,publication:{id:pub.id,kind:pub.kind,source:pub.source,user_id:pub.user_id}});
    }

    if(action==="renegotiate"){
      const sessionDescription=body?.session_description;
      if(!sessionDescription?.sdp)return jsonError("invalid_session_description");
      const data=await cf(`/sessions/${encodeURIComponent(providerSessionId)}/renegotiate`,{
        method:"PUT",
        body:JSON.stringify({sessionDescription})
      });
      return NextResponse.json(data);
    }

    return jsonError("unknown_action");
  }catch(error:any){
    return jsonError(error?.message||"sfu_error",502);
  }
}
