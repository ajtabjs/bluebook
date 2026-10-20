import io, sys
p = sys.argv[1]
s = io.open(p, encoding=chr(117)+chr(116)+chr(102)+chr(45)+chr(56)).read()
s = s.replace(chr(120)+chr(99)+chr(50)+chr(99)+chr(102)+chr(105)+chr(120)+chr(48)+chr(51), chr(120)+chr(99)+chr(50)+chr(99)+chr(102)+chr(105)+chr(120)+chr(48)+chr(52))
if chr(115)+chr(104)+chr(105)+chr(109) not in s:
    anchor = chr(60)+chr(47)+chr(116)+chr(105)+chr(116)+chr(108)+chr(101)+chr(62)
    tag = anchor + chr(60)+chr(115)+chr(99)+chr(114)+chr(105)+chr(112)+chr(116)+chr(32)+chr(115)+chr(114)+chr(99)+chr(61)+chr(46)+chr(47)+chr(115)+chr(104)+chr(105)+chr(109)+chr(46)+chr(106)+chr(115)+chr(62)+chr(60)+chr(47)+chr(115)+chr(99)+chr(114)+chr(105)+chr(112)+chr(116)+chr(62)
    s = s.replace(anchor, tag, 1)
io.open(p, chr(119), encoding=chr(117)+chr(116)+chr(102)+chr(45)+chr(56)).write(s)
print(chr(80)+chr(65)+chr(84)+chr(67)+chr(72)+chr(69)+chr(68))
