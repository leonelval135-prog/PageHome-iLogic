import {sb,BUCKET} from './config.js';
const b=()=>sb.storage.from(BUCKET);
export async function upload(uid,blob,kind,ext){
  const path=`${uid}/${Date.now()}_${kind}.${ext}`;
  for(let i=0;i<3;i++){const{error}=await b().upload(path,blob,{contentType:blob.type||undefined});if(!error)return path;if(i==2)throw error;await new Promise(r=>setTimeout(r,1000*(i+1)))}
}
export async function list(uid){
  const{data,error}=await b().list(uid,{limit:200,sortBy:{column:'created_at',order:'desc'}});
  if(error)throw error;
  const f=data.filter(x=>x.name&&!x.name.startsWith('.'));if(!f.length)return[];
  const{data:u}=await b().createSignedUrls(f.map(x=>`${uid}/${x.name}`),3600);
  return(u||[]).filter(x=>x.signedUrl).map(x=>({path:x.path,url:x.signedUrl,name:x.path.split('/')[1]}));
}
export const signed=async p=>(await b().createSignedUrl(p,3600)).data?.signedUrl;
export const remove=p=>b().remove([p]);
