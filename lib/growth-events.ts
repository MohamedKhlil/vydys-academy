"use client";

import { supabase } from "./supabase";

export type GrowthEvent =
  |"signup_started"|"course_viewed"|"course_checkout_started"|"course_order_submitted"
  |"portfolio_opened"|"portfolio_saved"|"talent_opt_in"
  |"talents_viewed"|"talent_contact_requested"
  |"jobs_viewed"|"job_application_submitted"|"company_application_submitted";

function identity(storage:Storage,key:string){
  const prior=storage.getItem(key);
  if(prior && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(prior))return prior;
  const value=crypto.randomUUID();
  storage.setItem(key,value);return value;
}

/** Anonymous-safe, pseudonymous event. Never send URLs with query params,
 * names, email, CV text, checkout amounts or messages. It is nonblocking. */
export async function trackGrowthEvent(event_type:GrowthEvent){
  if(typeof window==="undefined")return;
  try{
    const visitor_id=identity(localStorage,"vydys_analytics_visitor");
    const session_id=identity(sessionStorage,"vydys_analytics_session");
    const user=await supabase.auth.getUser();
    await supabase.from("vydys_growth_events").insert({
      event_type,visitor_id,session_id,user_id:user.data.user?.id||null,
      path:(window.location.pathname||"/").slice(0,180)
    });
  }catch{
    // Analytics must never interrupt sign-in, teaching, learning or checkout.
  }
}
