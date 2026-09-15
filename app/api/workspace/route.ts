import { getChatGPTUser } from "@/app/chatgpt-auth";
import { assertExport, applyWorkspaceMutation, loadAuthorizedSnapshot, responseError } from "@/lib/workspace-store";
import { z } from "zod";

export const dynamic="force-dynamic";
const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});

export async function GET(request:Request){
  const user=await getChatGPTUser();if(!user)return respond({error:"يرجى تسجيل الدخول للوصول إلى البيانات"},401);
  try{
    const loaded=await loadAuthorizedSnapshot(user);
    const exportKind=new URL(request.url).searchParams.get("export");
    if(exportKind) assertExport(loaded.access,exportKind);
    return respond(loaded.snapshot);
  }catch(e){const err=responseError(e);if(err.status>=500)console.error("Workspace load failed",e);return respond({error:err.error},err.status);}
}

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return respond({error:"يرجى تسجيل الدخول"},401);
  const origin=request.headers.get("origin");
  if(request.headers.get("sec-fetch-site")==="cross-site"||(origin&&origin!==new URL(request.url).origin))return respond({error:"الطلب غير مسموح"},403);
  try{
    if(Number(request.headers.get("content-length")||0)>1500000)return respond({error:"الطلب كبير جداً. قسّم البيانات إلى ملفات أصغر."},413);
    const text=await request.text();if(text.length>1500000)return respond({error:"الطلب كبير جداً"},413);
    const raw=JSON.parse(text);
    const {requestId,revision}=z.object({requestId:z.string().uuid(),revision:z.number().int().nonnegative()}).parse(raw);
    const loaded=await applyWorkspaceMutation(user,raw,revision,requestId);
    return respond(loaded.snapshot);
  }catch(e){
    const err=responseError(e);if(err.status>=500)console.error("Workspace write failed",e);
    return respond({error:err.error},err.status);
  }
}
