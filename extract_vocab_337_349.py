import csv
import re
from pathlib import Path

src = Path('vocab_pages_337_349.txt')
text = src.read_text(encoding='utf-8')
lines = text.splitlines()

ignore = {
    'Geirfa',
    'A', 'B', 'C', 'Ch', 'D', 'Dd', 'E', 'F', 'Ff', 'G', 'H', 'I', 'J', 'L', 'Ll',
    'M', 'N', 'O', 'P', 'Ph', 'R', 'Rh', 'S', 'T', 'Th', 'U', 'W',
    'ben. – fem., gwr. – masc., ll. – pl., gw. – see, bôn – stem',
}

records = []
seen = set()

for raw in lines:
    line = re.sub(r'\s+', ' ', raw).strip()
    if not line or re.fullmatch(r'\d+', line):
        continue
    if line in ignore:
        continue

    # Only split on the real glossary divider used in the book: a spaced en-dash.
    if ' – ' not in line:
        continue

    left, right = line.split(' – ', 1)
    left = left.strip()
    right = right.strip()
    if not left or not right:
        continue

    # Extract grammatical marker from the left side when present, e.g. 'cath (ben.)'.
    pos = ''
    pos_match = re.search(r'\(([^)]+)\)\s*$', left)
    if pos_match:
        pos = pos_match.group(1).strip()
        if pos in {'gwr.', 'ben.', 'll.', 'ans.'} or pos in {'gwr', 'ben', 'll', 'ans'}:
            left = left[:pos_match.start()].strip()
        else:
            pos = ''

    if not left or left in {'Geirfa', 'gwr.', 'ben.', 'll.', 'ans.', 'gw.'}:
        continue

    # Split any explicit plural note after a semicolon, e.g. 'a cat; cathod – cats'
    plural = ''
    meaning = right
    if ';' in meaning:
        main_part, extra_part = meaning.split(';', 1)
        main_part = main_part.strip()
        extra_part = extra_part.strip()
        if extra_part:
            extra_match = re.match(r'^(?P<plural>.+?)\s*(?:[-–])\s*(?P<eng>.+)$', extra_part)
            if extra_match:
                plural = extra_match.group('plural').strip()
                meaning = main_part
            else:
                # If the second part is just a cross-reference, keep the original meaning.
                meaning = main_part if main_part else right
        else:
            meaning = main_part

    # Remove explanatory notes from the English meaning.
    meaning = re.sub(r'\s*\(gw\..*?\)\s*$', '', meaning)
    meaning = re.sub(r'\s*\((?:Gogledd Cymru|De Cymru|Gorllewin Cymru)\)\s*$', '', meaning)
    meaning = re.sub(r'\s*\([^)]*\)\s*$', '', meaning)
    meaning = meaning.strip(' ,;')
    if not meaning:
        continue

    # Skip obvious page headers and letter headings.
    if re.fullmatch(r'[A-Z][a-zA-Z]*', left):
        continue
    if re.fullmatch(r'\d+', left):
        continue

    record = (left, meaning, f'({pos})' if pos else '', plural)
    if record not in seen:
        seen.add(record)
        records.append(record)

out = Path('welsh_vocab_337_349.csv')
with out.open('w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Welsh word', 'English meaning', 'Part of speech', 'Plural'])
    writer.writerows(records)

print(f'Wrote {len(records)} rows to {out.resolve()}')
for row in records[:15]:
    print(row)
