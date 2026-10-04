import { NextRequest } from "next/server";
import { Sandbox } from "@vercel/sandbox";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

const SUPABASE_URL="https://ruzwqmtqyvtpgccqonqi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_4hwMfwmOp1qI1-PB17K-_w_EpJf9ww6";

function reply(data:unknown,status=200){
  return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
}
function trimOutput(value:string,max=12000){
  const text=String(value||"");
  return text.length>max?text.slice(0,max)+"\n… output truncated":text;
}

export async function POST(req:NextRequest){
  const auth=req.headers.get("authorization")||"";
  const token=auth.replace(/^Bearer\s+/i,"");
  if(!token)return reply({error:"not_authenticated"},401);

  const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:`Bearer ${token}`}}
  });

  const {data:{user},error:userError}=await supabase.auth.getUser(token);
  if(userError||!user)return reply({error:"invalid_session"},401);

  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profile?.role!=="student")return reply({error:"student_access_required"},403);

  let body:any;
  try{body=await req.json()}catch{return reply({error:"invalid_json"},400)}
  const language=String(body?.language||"");
  const code=String(body?.code||"");

  if(!["python","node"].includes(language))return reply({error:"invalid_runtime"},400);
  if(!code.trim()||code.length>30000)return reply({error:"invalid_code_size"},400);

  const {data:jobId,error:jobError}=await supabase.rpc("request_secure_sandbox_job",{p_runtime:language});
  if(jobError)return reply({error:"sandbox_quota",detail:jobError.message},429);

  let sandbox:any=null;
  const started=Date.now();
  try{
    sandbox=await Sandbox.create({
      resources:{vcpus:1},
      timeout:20000,
      persistent:false,
      networkPolicy:"deny-all",
      tags:{app:"vydys",purpose:"student-practice"}
    });

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    let command:any;
    try{
      command=await sandbox.runCommand({
        cmd:language==="python"?"python3":"node",
        args:["-c",code],
        signal:controller.signal
      });
    }finally{
      clearTimeout(timer);
    }

    const stdout=trimOutput(await command.stdout());
    const stderr=trimOutput(await command.stderr());
    const exitCode=Number(command.exitCode??0);
    const durationMs=Date.now()-started;
    const status=exitCode===0?"passed":"failed";
    const result={stdout,stderr,exit_code:exitCode,duration_ms:durationMs,network:"deny-all",provider:"vercel-sandbox"};

    await supabase.rpc("finish_secure_sandbox_job",{p_job_id:jobId,p_status:status,p_result:result});
    return reply({ok:true,job_id:jobId,status,...result});
  }catch(error:any){
    const detail=trimOutput(error instanceof Error?error.message:String(error),3000);
    const result={stdout:"",stderr:detail,exit_code:null,duration_ms:Date.now()-started,network:"deny-all",provider:"vercel-sandbox"};
    await supabase.rpc("finish_secure_sandbox_job",{p_job_id:jobId,p_status:"failed",p_result:result});
    return reply({error:"sandbox_execution_failed",job_id:jobId,...result},500);
  }finally{
    if(sandbox){try{await sandbox.stop()}catch{}}
  }
}
