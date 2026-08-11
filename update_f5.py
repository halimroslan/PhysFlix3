import re

yt_data = [
    {"id": "vhdn3hN5dEI", "title": "T5 M39 Ulangkaji 2"},
    {"id": "LLSqz1_m70c", "title": "T5 M38 Ulangkaji 1"},
    {"id": "IfscyIktgKY", "title": "T5 M37 5 3 Pantulan Gelombang"},
    {"id": "fiU62dc28CQ", "title": "T5 M36 5 1 Asas Gelombang, 5 2 Pelebapan & Resonans"},
    {"id": "pxybkH01Azk", "title": "T5 M35 4 4 Hukum Gas"},
    {"id": "3LQFiZiZFN4", "title": "T5 M34 4 3 Haba Pendam Tentu"},
    {"id": "X7AM5HY6rao", "title": "T5 M33 3 1b Daya Memusat & Gerakan Membulat"},
    {"id": "5ziCKDRiKN0", "title": "T5 M32 2 2 Graf Gerakan Linear & 2 3 Jatuh Bebas Ulangkaji"},
    {"id": "vv8D9OFJYwg", "title": "T5 M31 7 3b Fotoelektrik Einstein"},
    {"id": "tpAkC22rMZ4", "title": "T5 M30 7 3a Fotoelektrik Einstein"},
    {"id": "-CQ0VOdPvGM", "title": "T5 M29 7 2 Kesan fotoelektrik"},
    {"id": "XYwzTA4k85k", "title": "T5 M28 7 1b Teori Kuantum Cahaya"},
    {"id": "zJNonpUorSA", "title": "T5 M27 7 1a Teori Kuantum Cahaya"},
    {"id": "Uq30VALZpjA", "title": "T5 M26 6 2b Tenaga Nuklear"},
    {"id": "lUq8MODvUsk", "title": "T5 M25 6 2a Tenaga Nuklear"},
    {"id": "GbbhAtx_joA", "title": "T5 M24 6 1b Reputan Radioaktif"},
    {"id": "SSGS1Quwduw", "title": "T5 M23 6 1a Reputan Radioaktif"},
    {"id": "hsipfTyLKJ4", "title": "T5 M22 5 3 Transistor"},
    {"id": "E2Tx1Kna30Y", "title": "T5 M21 5 2 Diod Semi konduktor"},
    {"id": "PYRmPjNHwsU", "title": "T5 M20 5 1 Elektron"},
    {"id": "dZx6d2lZEHs", "title": "T5 M19 4 3b Transformer"},
    {"id": "Sbu96-gv9p0", "title": "T5 M18 4 3a Transformer"},
    {"id": "dzWtuWLjaEs", "title": "T5 M17 4 2 Aruhan Elektromagnet"},
    {"id": "zTrONKA8eq8", "title": "T5 M16 4 1b Fleming Kiri"},
    {"id": "RmFYLIanMmI", "title": "T5 M15 4 1a Fleming Kiri"},
    {"id": "Rz8V6GIkJrE", "title": "T5 M14 3 4 Tenaga & Kuasa Elektrik"},
    {"id": "la169VuY5m8", "title": "T5 M13 3 3 DGE & Rintangan Dalam"},
    {"id": "54Q1QprReik", "title": "T5 M12 3 2b Rintangan"},
    {"id": "kgtQsstKkKE", "title": "T5 M11 3 2a Rintangan"},
    {"id": "hWOLQs32JxM", "title": "T5 M10 3 1 Arus & Beza Keupayaan"},
    {"id": "SUvhwPcPGB0", "title": "T5 M9 2 6 Prinsip Bernoulli"},
    {"id": "0v0l6-x6Sm8", "title": "T5 M8 2 5 Prinsip Archimedes"},
    {"id": "DQsdqZpriqY", "title": "T5 M7 2 3 Tekanan Gas 2 4 Prinsip Pascal"},
    {"id": "1K6ep0J0K-c", "title": "T5 M6 2 2 Tekanan Atmosfera"},
    {"id": "6JTIn6_MVBw", "title": "T5 M4 1 4 Kekenyalan"},
    {"id": "g8WRogfVPSc", "title": "T5 M2 1 3 Keseimbangan Daya"},
    {"id": "-o2sFv929IA", "title": "T5 M1 1 1 Daya Paduan"}
]

week_to_yt = {}
for item in yt_data:
    match = re.search(r'(T5\s+M\d+)', item['title'])
    if match:
        week = match.group(1)
        week_to_yt[week] = item['id']

file_path = "/Users/halimroslan/Desktop/physics-spm-flix/src/data/physicsData.ts"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    drive_id_line = match.group(1)
    week_str = match.group(2)
    rest_of_week_line = match.group(3)
    
    if week_str in week_to_yt:
        yt_id = week_to_yt[week_str]
        # Insert youtubeId right after driveId
        return f'{drive_id_line}    youtubeId: "{yt_id}",\n    week: "{week_str}"{rest_of_week_line}'
    
    return match.group(0)

# Regex to match:
# group 1: driveId line + any whitespace
# group 2: week string e.g. T5 M1
# group 3: rest of the line
new_content = re.sub(r'(    driveId:\s*"[^"]+",\n)    week:\s*"(T5 M\d+)"(.*)', replacer, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done ADDING youtubeId for Form 5 videos")
