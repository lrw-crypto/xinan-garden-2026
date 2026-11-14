export const BASES:readonly string[];
export const BASE_NAMES:Record<string,string>;
/** 造型字串：<基本造型>[+g 眼鏡][+f 雀斑]。 */
export function parseStyle(style:string|undefined):{base:string;glasses:boolean;freckles:boolean};
export function makeStyle(base:string,glasses:boolean,freckles:boolean):string;
/** 資料庫規則尚未更新時可用的舊造型代碼（human 或 bear）。 */
export function legacyStyle(style:string):string;
/** 登入畫面的人物預覽。 */
export class StudentPreview{constructor(canvas:HTMLCanvasElement,emblemUrl:string);ok:boolean;set(style:string):void;dispose():void}
