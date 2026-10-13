import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ruzwqmtqyvtpgccqonqi.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4hwMfwmOp1qI1-PB17K-_w_EpJf9ww6";

export async function POST(req:NextRequest){
  const livekitUrl=process.env.LIVEKIT_URL;
  const apiKey=process.env.LIVEKIT_API_KEY;
  const apiSecret=process.env.LIVEKIT_API_SECRET;

  if(!livekitUrl||!apiKey||!apiSecret){
    return NextResponse.json({enabled:false,reason:"not_configured"},{status:503});
  }

  const auth=req.headers.get("authorization")||"";
  const bearer=auth.startsWith("Bearer ")?auth.slice(7):"";
  if(!bearer)return NextResponse.json({error:"unauthorized"},{status:401});

  let body:any={};
  try{body=await req.json()}catch{}
  const sessionId=String(body?.session_id||"");
  if(!sessionId)return NextResponse.json({error:"missing_session_id"},{status:400});

  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:"Bearer "+bearer}}
  });

  const {data:{user},error:userError}=await supabase.auth.getUser(bearer);
  if(userError||!user)return NextResponse.json({error:"unauthorized"},{status:401});

  const {data:access,error:accessError}=await supabase.rpc("get_classroom_session_access",{p_session_id:sessionId});
  if(accessError||!access){
    return NextResponse.json({error:accessError?.message||"access_denied"},{status:403});
  }

  const role=access.role==="moderator"?"moderator":"student";
  const roomName=String(access.room_name||("vydys-"+sessionId));
  const at=new AccessToken(apiKey,apiSecret,{
    identity:user.id,
    name:role==="moderator"?"Instructor":"Learner",
    ttl:"2h"
  });

  at.addGrant(role==="moderator"?{
    roomJoin:true,
    room:roomName,
    roomAdmin:true,
    canSubscribe:true,
    canPublish:true,
    canPublishData:false,
    canPublishSources:["camera","microphone","screen_share","screen_share_audio"] as any
  }:{
    roomJoin:true,
    room:roomName,
    canSubscribe:true,
    canPublish:true,
    canPublishData:false,
    canPublishSources:["microphone"] as any
  });

  return NextResponse.json({
    enabled:true,
    url:livekitUrl,
    token:await at.toJwt(),
    room_name:roomName,
    role
  });
}
