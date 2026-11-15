import cv2,numpy as np,json,os
from PIL import Image
import sys;R=(sys.argv[1] if len(sys.argv)>1 else '.')+'/';S=R+'reference/sheets/';O=R+'public/art/figures/';os.makedirs(O,exist_ok=True)
names=['boyg','crew','long','longg','pony','cat','bunny','shiba','bear','frog','yfrog']
code={'boyg':'short','crew':'crew','long':'long','longg':'longg','pony':'pony','cat':'cat','bunny':'bunny','shiba':'shiba','bear':'teddy','frog':'frog','yfrog':'yfrog'}
PAN={'sit':(545,1095),'front':(1100,1590),'back':(1595,2085),'side':(2095,2576)}
EMB={'front':(1350,1432,575,665),'sit':(832,908,690,765),'side':(2232,2276,578,664)}
SC=.5
def bgmask(im):
    r,g,b=[im[:,:,i].astype(int) for i in (2,1,0)];mn=np.minimum(np.minimum(r,g),b);mx=np.maximum(np.maximum(r,g),b)
    white=mn>=246
    shadow=(b-r>=4)&(mn>=170)&(mx-mn<=62)&(b>=g)&(g>=r-2)
    h,w=mn.shape;yy,xx=np.mgrid[0:h,0:w]
    shadow&=(yy>1090)|((yy>930)&(xx<1100))
    cand=(white|shadow).astype(np.uint8)
    n,lab=cv2.connectedComponents(cand,connectivity=4)
    edge=set(lab[0])|set(lab[-1])|set(lab[:,0])|set(lab[:,-1]);edge.discard(0)
    return np.isin(lab,list(edge))
M={n:cv2.imread(S+n+'.jpg') for n in names};F={n:~bgmask(M[n]) for n in names}
vote=sum(F[n].astype(int) for n in names)>=6
meta={};ref=None
for n in names:
    im=M[n];fg=F[n].copy();fg[1125:]=vote[1125:];fg[940:,:1100]=vote[940:,:1100]
    light=(im.min(2)>200)&((im.max(2).astype(int)-im.min(2))<40)
    yy,xx=np.mgrid[0:fg.shape[0],0:fg.shape[1]]
    kill=light&(((xx>972)&(xx<1100)&(yy>1000))|((xx<648)&(xx>500)&(yy>1035))|((xx>=1100)&(xx<1166)&(yy>950))|((yy>1262)))
    fg[kill]=False
    fg=cv2.morphologyEx(fg.astype(np.uint8)*255,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    meta[code[n]]={}
    for pose,(x0,x1) in PAN.items():
        m=np.zeros_like(fg);m[:1300,x0:x1]=fg[:1300,x0:x1]
        k,lab,st,_=cv2.connectedComponentsWithStats(m);big=1+np.argmax(st[1:,4]);m=np.where(lab==big,255,0).astype(np.uint8)
        ff=m.copy();cv2.floodFill(ff,np.zeros((m.shape[0]+2,m.shape[1]+2),np.uint8),(0,0),255);m|=cv2.bitwise_not(ff)
        src=im.copy();em=None
        if pose in EMB:
            ex0,ex1,ey0,ey1=EMB[pose];box=src[ey0:ey1,ex0:ex1].astype(int);mn=box.min(2);mx=box.max(2)
            ink=((mx-mn>40)|(mn<150)).astype(np.uint8)
            ys,xs=np.where(ink>0)
            if len(xs):
                cx,cy=ex0+(xs.min()+xs.max())/2,ey0+(ys.min()+ys.max())/2;rx,ry=(xs.max()-xs.min())/2+7,(ys.max()-ys.min())/2+7
                hole=np.zeros(m.shape,np.uint8);cv2.ellipse(hole,(int(cx),int(cy)),(int(rx),int(ry)),0,0,360,255,-1)
                src=cv2.inpaint(src,hole,9,cv2.INPAINT_TELEA);em=(cx,cy,ry-7)
        a=cv2.GaussianBlur(m,(5,5),0);ys,xs=np.where(a>40);bx0,bx1,by0,by1=xs.min()-3,xs.max()+4,ys.min()-3,ys.max()+4
        rgba=cv2.cvtColor(src,cv2.COLOR_BGR2RGBA);rgba[:,:,3]=a;crop=rgba[by0:by1,bx0:bx1];H,W=crop.shape[:2]
        Image.fromarray(crop).resize((round(W*SC),round(H*SC)),Image.LANCZOS).save(f'{O}{code[n]}-{pose}.webp',quality=88,method=6)
        d={'w':W,'h':H}
        if em and pose!='side':d['emblem']=[round((em[0]-bx0)/W,4),round((em[1]-by0)/H,4),round(2*em[2]/W,4)]
        hard=m>127
        if pose in('front','back'):
            cy=885;row=np.where(hard[1000,x0:x1])[0]+x0;gaps=np.where(np.diff(row)>6)[0]
            mid=(row[gaps[0]]+row[gaps[0]+1])/2 if len(gaps) else (row.min()+row.max())/2
            d['legs']={'cut':round((cy-by0)/H,4),'split':round((mid-bx0)/W,4),'l':round(((row.min()+mid)/2-bx0)/W,4),'r':round(((mid+row.max())/2-bx0)/W,4)}
        if pose=='side':
            row=np.where(hard[1050,x0:x1])[0]+x0;d['legs']={'cut':round((885-by0)/H,4),'pivot':round(((row.min()+row.max())/2-bx0)/W,4)}
        meta[code[n]][pose]=d
        if n=='boyg' and pose=='front':ref=H
out={'ref':ref,'styles':meta}
json.dump(out,open(R+'src/figures.json','w'),separators=(',',':'))
print('ref',ref,json.dumps(meta['short']),json.dumps(meta['cat']['side']))
# contact sheet
tiles=[]
for n in ['short','crew','long','longg','pony','cat','bunny','shiba','teddy','frog','yfrog']:
    row=Image.new('RGB',(4*260,330),(150,200,150))
    for i,p in enumerate(['front','back','side','sit']):
        s=Image.open(f'{O}{n}-{p}.webp');s.thumbnail((250,320));row.paste(s,(i*260+5,330-s.height-4),s)
    tiles.append(row)
sheet=Image.new('RGB',(3*1040,4*330),(150,200,150))
for i,t in enumerate(tiles):sheet.paste(t,((i%3)*1040,(i//3)*330))
sheet.crop((0,0,2080,660)).save('/tmp/fig/sheet.png')
