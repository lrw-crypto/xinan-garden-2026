// Normalized chest anchors in the original transparent character textures.
// The official emblem is loaded directly, never regenerated, tinted or mirrored.
export const schoolEmblemUrl=import.meta.env.BASE_URL+'art/school-emblem.png';
export const studentAppearance={
 'short-standing':{width:627,height:662,x:.59,y:.46,size:.047},
 'long-standing':{width:602,height:646,x:.53,y:.45,size:.048},
 'short-seated':{width:625,height:562,x:.60,y:.57,size:.033},
 'long-seated':{width:472,height:564,x:.562,y:.57,size:.043},
 // 馬尾同學取自使用者提供的參考圖：去背、把圖上原本的徽章抹平，再疊上原始校徽
 'pony-standing':{width:285,height:662,x:.618,y:.493,size:.163,scale:.82}
} as const;
export type StudentTexture=keyof typeof studentAppearance;
export function studentPreview(hair:'short'|'long'|'pony',alt:string){
 const key=(hair+'-standing') as StudentTexture;
 const p=studentAppearance[key];
 return `<span class="student-portrait" style="aspect-ratio:${p.width}/${p.height}"><img class="student-body" src="${import.meta.env.BASE_URL}art/students/${key}.webp" alt="${alt}"><img class="student-emblem" src="${schoolEmblemUrl}" alt="草商原始校徽" style="left:${p.x*100}%;top:${p.y*100}%;width:${p.size*100}%"></span>`;
}
