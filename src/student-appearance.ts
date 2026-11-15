import figures from './figures.json';
// 人物圖取自使用者提供的造型表（reference/sheets/），由 tools/build-figures.py 去背、抹掉圖上的徽章後輸出（人物胸口不顯示任何徽章）。
export {figures};
/** 登入畫面的造型選項：[資料庫代碼, 圖檔名稱, 顯示名稱] */
export const studentChoices:[string,string,string][]=[['short+g','short','短髮眼鏡'],['crew','crew','平頭'],['long','long','長髮'],['long+g','longg','長髮眼鏡'],['pony','pony','馬尾'],['cat','cat','小貓'],['bunny','bunny','小兔子'],['shiba','shiba','柴犬'],['teddy','teddy','小熊'],['frog','frog','青蛙'],['yfrog','yfrog','黃金蛙']];
export function studentPreview(key:string,alt:string){
 const p=(figures.styles as Record<string,{front:{w:number;h:number}}>)[key].front;
 return `<span class="student-portrait" style="aspect-ratio:${p.w}/${p.h}"><img class="student-body" src="${import.meta.env.BASE_URL}art/figures/${key}-front.webp" alt="${alt}"></span>`;
}
