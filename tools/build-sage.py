"""把數學上神的造型表（reference/sheets/math-sage.jpg）去背，輸出正面與背面。用法：python3 tools/build-sage.py ."""
import cv2,numpy as np,sys
from PIL import Image
R=(sys.argv[1] if len(sys.argv)>1 else '.')+'/'
im=cv2.imread(R+'reference/sheets/math-sage.jpg');h,w=im.shape[:2]
mn=im.min(2).astype(int);mx=im.max(2).astype(int);yy,xx=np.mgrid[0:h,0:w]
white=mn>=244
shadow=(mx-mn<=14)&(mn>=150)&(yy>1262)          # 地上的灰色影子
cand=(white|shadow).astype(np.uint8)
n,lab=cv2.connectedComponents(cand,connectivity=4)
edge=set(lab[0])|set(lab[-1])|set(lab[:,0])|set(lab[:,-1]);edge.discard(0)
fg=(~np.isin(lab,list(edge))).astype(np.uint8)*255
out={}
for name,(x0,x1) in {'front':(60,720),'back':(1960,2520)}.items():
    m=np.zeros_like(fg);m[:,x0:x1]=fg[:,x0:x1]
    # 白鞋和白底、影子顏色接近：鞋子用橢圓補回，影子用鞋底以下裁掉
    for cx in ((268,480) if name=='front' else (2140,2350)):cv2.ellipse(m,(cx,1318),(62,40),0,0,360,255,-1);cv2.rectangle(m,(cx-28,1250),(cx+28,1318),255,-1)
    m[1362:]=0
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    k,l2,st,_=cv2.connectedComponentsWithStats(m);m=np.where(l2==1+np.argmax(st[1:,4]),255,0).astype(np.uint8)
    ff=m.copy();cv2.floodFill(ff,np.zeros((h+2,w+2),np.uint8),(0,0),255);m|=cv2.bitwise_not(ff)
    a=cv2.GaussianBlur(m,(5,5),0);ys,xs=np.where(a>40);bx0,bx1,by0,by1=xs.min()-3,xs.max()+4,ys.min()-3,ys.max()+4
    rgba=cv2.cvtColor(im,cv2.COLOR_BGR2RGBA);rgba[:,:,3]=a;crop=rgba[by0:by1,bx0:bx1];H,W=crop.shape[:2]
    Image.fromarray(crop).resize((W//2,H//2),Image.LANCZOS).save(R+f'public/art/sage-{name}.webp',quality=90,method=6)
    out[name]=(W,H);print(name,W,H)
