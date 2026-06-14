import os
import json
import numpy as np

# ==============================
# BASE FOLDER
# ==============================
base_dir = "/home/willow/Desktop/kimia/sample0/LNm0.5s0.736L0.1H15.0"

# ==============================
# OUTPUT FOLDER
# ==============================
output_dir = os.path.join(base_dir, "split_data")
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

                rel_path = os.path.relpath(file_path, base_dir)
                safe_key = rel_path.replace("/", "_").replace("\\", "_")

                out_path = os.path.join(output_dir, f"data_{safe_key}.json")

                with open(out_path, "w") as f:
                    json.dump({"x": x, "y": y}, f)

                count += 1

            except Exception as e:
                print(f"Skipping {file_path}: {e}")

print("DONE → split dataset created")
print("Files written:", count)

# ==============================
# ✅ ADD MANIFEST (IMPORTANT)
# ==============================

manifest = [
    f for f in os.listdir(output_dir)
    if f.endswith(".json")
]

manifest_path = os.path.join(output_dir, "manifest.json")

with open(manifest_path, "w") as f:
    json.dump(manifest, f)

print("manifest.json created")
print("Total files in manifest:", len(manifest))

'''Then commit the changes:
go to the right directory first:

cd ~/Desktop/kimia/sample0/LNm0.5s0.736L0.1H15.0

git add .
git commit -m "Update dataset"
git push

If Git rejects the push because the remote changed, do:

git pull --rebase origin main
git push'''