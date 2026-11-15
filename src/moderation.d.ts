/** 檢查一句心願是否適合掛上祈福樹。care 為 true 時，內容透露出很辛苦的心情。 */
export function checkWish(text:string,opts?:{vent?:boolean}):{ok:true}|{ok:false;reason:string;care?:boolean};
