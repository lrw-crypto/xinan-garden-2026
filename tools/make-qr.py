"""產生「掃描進入輔導寺」的 QR Code（public/art/qr.svg）。
自帶 QR 編碼（版本 6、容錯等級 H、位元組模式），不需要額外套件。
用法：python3 tools/make-qr.py [網址]"""
import sys
URL=sys.argv[1] if len(sys.argv)>1 else 'https://lrw-crypto.github.io/xinan-garden-2026/'
V=6;N=17+4*V;DATA=60;BLOCKS=4;EC=28
EXP=[0]*512;LOG=[0]*256;x=1
for i in range(255):
    EXP[i]=x;LOG[x]=i;x<<=1
    if x&256:x^=0x11d
for i in range(255,512):EXP[i]=EXP[i-255]
def mul(a,b):return 0 if a==0 or b==0 else EXP[LOG[a]+LOG[b]]
def rs(data,n):
    g=[1]
    for i in range(n):
        g=[a^b for a,b in zip(g+[0],[0]+[mul(c,EXP[i]) for c in g])]
    gen=g;rem=[0]*n  # 係數由最高次項排到最低次項
    for d in data:
        f=d^rem[0];rem=rem[1:]+[0]
        for i in range(n):rem[i]^=mul(gen[i+1],f)
    return rem
raw=URL.encode();assert len(raw)<=DATA-2,'網址太長'
bits='0100'+format(len(raw),'08b')+''.join(format(b,'08b') for b in raw)+'0000'
bits=bits[:DATA*8];bits+='0'*(-len(bits)%8)
cw=[int(bits[i:i+8],2) for i in range(0,len(bits),8)]
pad=[0xEC,0x11];i=0
while len(cw)<DATA:cw.append(pad[i%2]);i+=1
size=DATA//BLOCKS;blocks=[cw[i*size:(i+1)*size] for i in range(BLOCKS)];ecs=[rs(b,EC) for b in blocks]
seq=[b[i] for i in range(size) for b in blocks]+[e[i] for i in range(EC) for e in ecs]
stream=''.join(format(c,'08b') for c in seq)+'0'*7
M=[[None]*N for _ in range(N)];F=[[False]*N for _ in range(N)]
def put(r,c,v):
    if 0<=r<N and 0<=c<N:M[r][c]=v;F[r][c]=True
for (r0,c0) in ((0,0),(0,N-7),(N-7,0)):
    for r in range(-1,8):
        for c in range(-1,8):
            inside=0<=r<=6 and 0<=c<=6
            put(r0+r,c0+c,inside and (r in(0,6) or c in(0,6) or (2<=r<=4 and 2<=c<=4)))
for i in range(8,N-8):put(6,i,i%2==0);put(i,6,i%2==0)
for r in range(-2,3):
    for c in range(-2,3):put(34+r,34+c,max(abs(r),abs(c))!=1)
put(4*V+9,8,True)
for i in range(9):
    if not F[8][i]:put(8,i,False)
    if not F[i][8]:put(i,8,False)
for i in range(8):put(8,N-1-i,False);put(N-1-i,8,False)
pos=[];c=N-1;up=True
while c>0:
    if c==6:c-=1
    for r in (range(N-1,-1,-1) if up else range(N)):
        for cc in (c,c-1):
            if not F[r][cc]:pos.append((r,cc))
    up=not up;c-=2
assert len(pos)==len(stream),(len(pos),len(stream))
MASK=[lambda r,c:(r+c)%2==0,lambda r,c:r%2==0,lambda r,c:c%3==0,lambda r,c:(r+c)%3==0,lambda r,c:(r//2+c//3)%2==0,lambda r,c:(r*c)%2+(r*c)%3==0,lambda r,c:((r*c)%2+(r*c)%3)%2==0,lambda r,c:((r+c)%2+(r*c)%3)%2==0]
def build(k):
    m=[row[:] for row in M]
    for (r,c),b in zip(pos,stream):m[r][c]=(b=='1')^MASK[k](r,c)
    f=(0b10<<3)|k;rem=f
    for _ in range(10):rem=(rem<<1)^((rem>>9)*0x537)
    fmt=((f<<10)|rem)^0x5412;fb=[(fmt>>i)&1==1 for i in range(15)]
    for i in range(6):m[i][8]=fb[i]
    m[7][8]=fb[6];m[8][8]=fb[7];m[8][7]=fb[8]
    for i in range(9,15):m[8][14-i]=fb[i]
    for i in range(8):m[8][N-1-i]=fb[i]
    for i in range(8,15):m[N-15+i][8]=fb[i]
    m[N-8][8]=True
    return m
def penalty(m):
    p=0
    for lines in (m,[list(col) for col in zip(*m)]):
        for row in lines:
            run=1
            for i in range(1,N):
                if row[i]==row[i-1]:run+=1
                else:
                    if run>=5:p+=run-2
                    run=1
            if run>=5:p+=run-2
            s=''.join('1' if v else '0' for v in row)
            p+=40*(s.count('10111010000')+s.count('00001011101'))
    for r in range(N-1):
        for c in range(N-1):
            if m[r][c]==m[r][c+1]==m[r+1][c]==m[r+1][c+1]:p+=3
    dark=sum(map(sum,m))*100//(N*N);p+=abs(dark-50)//5*10
    return p
best=min((build(k) for k in range(8)),key=penalty)
# ── 繪製：圓點模組、圓角定位框，中央留白放青松與梅花 ──
Q=4;S=N+2*Q;mid=N/2;HOLE=6.2
PLUM='#6a3350';PINE='#2f6b4f'
out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" role="img" aria-label="掃描進入輔導寺">','<rect width="100%" height="100%" rx="4" fill="#fffdf8"/>',f'<g transform="translate({Q} {Q})">']
finder=lambda r,c:(r<7 and c<7) or (r<7 and c>=N-7) or (r>=N-7 and c<7)
for r in range(N):
    for c in range(N):
        if not best[r][c] or finder(r,c):continue
        if (r+.5-mid)**2+(c+.5-mid)**2<HOLE**2:continue
        # 圓角方塊：比圓點容易被各種掃描器辨識，仍保有柔和的邊角
        out.append(f'<rect x="{c+.02}" y="{r+.02}" width=".96" height=".96" rx=".34" fill="{PLUM}"/>')
for (r0,c0) in ((0,0),(0,N-7),(N-7,0)):
    out.append(f'<rect x="{c0+.5}" y="{r0+.5}" width="6" height="6" rx=".5" fill="none" stroke="{PINE}" stroke-width="1"/><rect x="{c0+2}" y="{r0+2}" width="3" height="3" rx=".4" fill="{PLUM}"/>')
# 中央小圖：左邊青松、右邊梅枝（原創繪製）
out.append(f'<g transform="translate({mid} {mid})"><circle r="5.7" fill="#fff6ee" stroke="#ecd3dd" stroke-width=".3"/>'
 '<path d="M-2.6 4.2 Q-2.2 1 -2.4 -1.6" stroke="#8a5a48" stroke-width=".55" fill="none" stroke-linecap="round"/>'
 +''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{col}"/>' for x,y,rx,ry,col in [(-2.4,-2.6,1.5,.75,'#3f8a5e'),(-3.3,-.9,1.5,.7,'#4f9a6a'),(-1.6,-.5,1.4,.65,'#3f8a5e'),(-2.6,1,1.9,.75,'#4f9a6a')])+
 '<path d="M1 4.3 Q1.6 2 1.2 .6 Q2.6 -.4 2.4 -2.6 M1.3 .9 Q2.9 1.2 3.9 .1" stroke="#4d3833" stroke-width=".5" fill="none" stroke-linecap="round"/>'
 +''.join(f'<g transform="translate({x} {y})">'+''.join(f'<circle cx="{.42*__import__("math").cos(a*1.2566):.2f}" cy="{.42*__import__("math").sin(a*1.2566):.2f}" r=".36" fill="{col}"/>' for a in range(5))+'<circle r=".2" fill="#f6c945"/></g>' for x,y,col in [(2.4,-2.8,'#f08fb4'),(3.9,0,'#e2567f'),(1.1,.5,'#f9a8c4'),(2.7,-.9,'#f08fb4')])+
 '<path d="M-4.6 4.3 H4.6" stroke="#cfe5b4" stroke-width=".5" stroke-linecap="round"/></g>')
out.append('</g></svg>')
open('public/art/qr.svg','w',encoding='utf8').write(''.join(out))
print('ok',N,'modules')
