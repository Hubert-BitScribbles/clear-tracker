# Help lines and links due for a re-check.
#   python3 checks/stale_resources.py               entries checked more than 6 months ago
#   python3 checks/stale_resources.py --months 3    …more than 3 months ago
#   python3 checks/stale_resources.py --all         every entry, oldest first
# Reads src/resources/<country>.ts, where each entry has source: and checked:.
# Exits 1 when something is due, so it can gate a release.
import datetime, glob, os, re, sys

args = sys.argv[1:]
months = int(args[args.index('--months') + 1]) if '--months' in args else 6
today = datetime.date.today()
cutoff = today.replace(day=1)
for _ in range(months):
    cutoff = (cutoff - datetime.timedelta(days=1)).replace(day=1)
cutoff = cutoff.replace(day=min(today.day, 28))

root = os.path.join(os.path.dirname(__file__), '..', 'src', 'resources')
rows = []
for path in sorted(glob.glob(os.path.join(root, '*.ts'))):
    cc = os.path.basename(path)[:-3]
    for n, line in enumerate(open(path, encoding='utf-8'), 1):
        m = re.search(r"checked: '(\d{4}-\d\d-\d\d)'", line)
        if not m:
            continue
        what = re.search(r"id: '([^']+)'", line) or re.search(r"number: '([^']+)'", line)
        label = what.group(1) if what else '?'
        if 'number:' in line and 'id:' not in line:
            label = 'emergency ' + label
        src = re.search(r"source: ([A-Z_]+(?: \+ '[^']*')?|'[^']*')", line)
        rows.append((m.group(1), cc, label, src.group(1).strip() if src else '', f'{os.path.basename(path)}:{n}'))

rows.sort()
due = [r for r in rows if datetime.date.fromisoformat(r[0]) < cutoff]
show = rows if '--all' in args else due
for checked, cc, label, src, where in show:
    print(f'{checked}  {cc:3} {label:22} {src}  ({where})')
print(f'{len(due)} of {len(rows)} entries were last checked before {cutoff.isoformat()} ({months} months ago).')
sys.exit(1 if due else 0)
