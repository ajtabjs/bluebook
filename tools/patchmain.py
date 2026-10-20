p=chr(109)+chr(97)+chr(105)+chr(110)+chr(46)+chr(106)+chr(115)
d=open(p,chr(114)+chr(98)).read()
old=bytes([119,105,110,100,111,119,91,118,48,74,46,114,95,74,40,53,54,55,41,93,91,118,48,74,46,114,95,74,40,56,51,54,50,41,93,40,118,48,74,46,84,36,78,40,49,57,54,41,41])
new=bytes([97,54,90,40,41])
c=d.count(old)
print(chr(109)+chr(97)+chr(116)+chr(99)+chr(104)+chr(101)+chr(115),c)
if c==1:
    open(p,chr(119)+chr(98)).write(d.replace(old,new))
    print(chr(80)+chr(65)+chr(84)+chr(67)+chr(72)+chr(69)+chr(68))
else:
    print(chr(65)+chr(66)+chr(79)+chr(82)+chr(84))
