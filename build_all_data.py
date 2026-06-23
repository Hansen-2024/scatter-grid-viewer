import os
import json
import numpy as np
import re

def clean_name(s):
    # replace tuples like (0,200,None)
    s = re.sub(r"\(|\)|,", "-", s)
    s = s.replace("None", "N")
    s = s.replace("--", "-")
    return s
# ==============================
# BASE FOLDER
# ==============================
base_dir = "/home/willow/Desktop/kimia/sample0/LNm0.5s0.736L0.1H15.0"

# ==============================
# OUTPUT FOLDER
# ==============================
output_dir = os.path.join(base_dir, "split_data")
os.makedirs(output_dir, exist_ok=True)
import shutil

if os.path.exists(output_dir):
    shutil.rmtree(output_dir)

os.makedirs(output_dir, exist_ok=True)
# ==============================
# SCAN ALL .DAT FILES AND SPLIT
# ==============================
count = 0

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".dat"):
            file_path = os.path.join(root, file)

            try:
                data = np.loadtxt(file_path)

                if data.ndim == 1:
                    data = data.reshape(1, -1)

                x = data[:, 0].tolist()
                y = data[:, 1].tolist()

                seed_folder = os.path.basename(
                    os.path.dirname(
                        os.path.dirname(file_path)
                    )
                )

                filename = os.path.basename(file_path)
                file_stem = os.path.splitext(filename)[0]
                seed_folder_clean = clean_name(seed_folder)
                file_clean = os.path.splitext(filename)[0]

                safe_key = f"{seed_folder_clean}_{file_stem}"
                out_path = os.path.join(output_dir, f"data_{safe_key}.json")

                out_path = os.path.join(output_dir, f"data_{safe_key}.json")

                # -----------------------
                # add color if exists
                # -----------------------

                base_name = os.path.splitext(file_path)[0]
                color_file = base_name.replace("_raster", "_color") + ".json"

                if os.path.exists(color_file):
                    print("FOUND COLOR:", color_file)
                    with open(color_file) as cf:

                        colors = json.load(cf)["color"]

                    with open(out_path, "w") as f:

                        json.dump({
                            "x": x,
                            "y": y,
                            "color": colors
                        }, f)

                else:
                    print("NO COLOR:", color_file)
                    with open(out_path, "w") as f:

                        json.dump({
                            "x": x,
                            "y": y
                        }, f)
                count += 1

            except Exception as e:
                print(f"Skipping {file_path}: {e}")

print("DONE → split dataset created")
print("Files written:", count)

# ==============================
# ✅ ADD MANIFEST (IMPORTANT)
# ==============================
import glob
import os
import json

manifest = [
    os.path.relpath(f, output_dir)
    for f in glob.glob(output_dir + "/**/*.json", recursive=True)
    if os.path.basename(f) != "manifest.json"
]

manifest_path = os.path.join(output_dir, "manifest.json")

with open(manifest_path, "w") as f:
    json.dump(manifest, f)

print("manifest.json created")
print("Total files in manifest:", len(manifest))
import glob

all_json = glob.glob(output_dir + "/**/*.json", recursive=True)

print("TOTAL JSON RECURSIVE:", len(all_json))
'''Then commit the changes:
go to the right directory first:
#============================================
cd ~/Desktop/kimia/sample0/LNm0.5s0.736L0.1H15.0
git fetch origin
git pull --rebase origin main
git push origin main
#============================================
#if run conflicts:
git status
git add .
git rebase --continue
git push origin main

IF Git says “fetch first” (VERY COMMON)
Then run this instead:
git pull --rebase origin main
git push origin main
'''
