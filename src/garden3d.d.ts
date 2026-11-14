export type Player={name:string;color:string;style:string;x:number;y:number;state:string;updatedAt:number;emoji?:string};
type Point={x:number;y:number};
/** 五個互動點；x、y 為資料庫座標（人物站立的位置）。 */
export const spots:{name:string;x:number;y:number}[];
/** 場景內固定站位，皆為資料庫座標。 */
export const places:{spawn:Point;hutDoor:Point;queue:(index:number)=>Point};
export class Garden3D{
  constructor(host:HTMLElement,opts:{assetBase:string;emblemUrl:string;anchors:Record<string,{width:number;height:number;x:number;y:number;size:number}>});
  /** false 表示瀏覽器無法建立 WebGL，庭院不顯示，但其餘介面仍可使用。 */
  ok:boolean;
  players:Record<string,Player>;
  uid:string;
  moved:(x:number,y:number)=>void;
  interact:(index:number)=>void;
  stop():void;
  /** 找空位（長椅每張三人、共五張；蒲團四個）。坐滿時回傳 null。 */
  findSeat(kind:'bench'|'cushion'):Point|null;
  goSpot(index:number):void;
  hangWish():void;
  /** 顯示「滑動接引聖光」提示；滑滿 needed 下（或按按鈕）後呼叫 done。 */
  beginSwipe(needed:number,done:()=>void):void;
  cancelSwipe():void;
}
