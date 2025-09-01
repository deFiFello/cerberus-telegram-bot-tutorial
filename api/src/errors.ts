export type AppError = { code:string; http:number; msg:string; details?:unknown };
export const ERR = {
  SHIELD_FLAG: { code:"SHIELD_FLAG", http:400, msg:"Token failed safety check" },
  QUOTE_FAIL:  { code:"QUOTE_FAIL",  http:502, msg:"Upstream quote error" },
  SWAP_FAIL:   { code:"SWAP_FAIL",   http:502, msg:"Swap broadcast failed" },
  RATE_LIMIT:  { code:"RATE_LIMIT",  http:429, msg:"Too many requests" }
} as const;
export const sendErr = (res:any, e:AppError) => res.status(e.http).json(e);