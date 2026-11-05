export class ApiError extends Error{
 constructor(key,params={}){super(key);this.key=key;this.params=params;}
}
export async function githubRequest(endpoint,optional=false,fetcher=fetch){
 const response=await fetcher(`https://api.github.com${endpoint}`,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
 if(optional&&response.status===404)return null;
 if(response.ok)return response.json();
 if(response.status===404)throw new ApiError('notFound');
 let body={};try{body=await response.json();}catch{}
 const remaining=response.headers.get('x-ratelimit-remaining');
 const limited=response.status===429||(response.status===403&&(remaining==='0'||response.headers.has('retry-after')||/rate limit|abuse detection/i.test(body.message??'')));
 if(limited){
  const reset=Number(response.headers.get('x-ratelimit-reset'));
  const retryAfter=Number(response.headers.get('retry-after'));
  // Retry-After takes priority for secondary limits; ordinary 403s stay HTTP errors.
  const retryAt=retryAfter>0?Math.ceil(Date.now()/1000)+retryAfter:remaining==='0'?reset:0;
  throw new ApiError('rateLimit',{reset:Number.isFinite(retryAt)?retryAt:0});
 }
 throw new ApiError('httpError',{code:response.status});
}
