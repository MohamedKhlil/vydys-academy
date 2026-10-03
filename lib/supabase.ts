import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ruzwqmtqyvtpgccqonqi.supabase.co";
const supabasePublishableKey = "sb_publishable_4hwMfwmOp1qI1-PB17K-_w_EpJf9ww6";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
