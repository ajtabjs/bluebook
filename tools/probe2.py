import base64
d=open(chr(109)+chr(97)+chr(105)+chr(110)+chr(46)+chr(106)+chr(115),chr(114)+chr(98)).read()
tb=bytes([99,104,114,111,109,101,98,111,111,107,45,101,114,114,111,114])
cb=bytes([99,104,114,111,109,101,98,111,111,107])
bb=bytes([98,108,117,101,98,111,111,107])
col=bytes([99,111,108,108,101,103,101,98,111,97,114,100])
print(0,chr(99)+chr(98),d.count(tb))
print(1,chr(99),d.count(cb))
print(2,chr(98),d.count(bb))
print(3,chr(99)+chr(111)+chr(108),d.count(col))
print(4,chr(98)+chr(54)+chr(52),d.count(base64.b64encode(tb)))
print(5,chr(104)+chr(101)+chr(120),d.count(tb.hex().encode()))
print(6,chr(114)+chr(101)+chr(118),d.count(tb[::-1]))
found=[]
for k in range(1,256):
    x=bytes(c^k for c in tb)
    if d.find(x)!=-1:
        found.append(k)
print(7,chr(120)+chr(111)+chr(114),found)
print(8,chr(119)+chr(105)+chr(110),d.count(bytes([119,105,110,100,111,119,91])))
print(9,chr(114)+chr(101)+chr(112),d.count(bytes([114,101,112,108,97,99,101])))
print(10,chr(99)+chr(116)+chr(120)+chr(49),d[3335561:3335761])
print(11,chr(99)+chr(116)+chr(120)+chr(50),d[3676154:3676354])
