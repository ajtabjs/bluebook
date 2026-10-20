import json,sys
f=sys.argv[1];k=sys.argv[2]
d=json.load(open(f))
print(repr(d.get(k)))
