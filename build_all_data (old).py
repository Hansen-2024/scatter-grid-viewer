import os
import json
import numpy as np

# ==============================
# BASE FOLDER (your dataset root)
# ==============================
base_dir = "/home/willow/Desktop/kimia/sample0/LNm0.5s0.736L0.1H15.0"

output = {}

# ==============================
# SCAN ALL .DAT FILES
# ==============================
for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".dat"):
            file_path = os.path.join(root, file)

            try:
                data = np.loadtxt(file_path)

                # handle case: single line or malformed file
                if data.ndim == 1:
                    data = data.reshape(1, -1)

                x = data[:, 0].tolist()
                y = data[:, 1].tolist()

                # store relative path as key
                rel_path = os.path.relpath(file_path, base_dir)

                output[rel_path] = {
                    "x": x,
                    "y": y
                }

            except Exception as e:
                print(f"Skipping {file_path}: {e}")

# ==============================
# SAVE OUTPUT IN SAME FOLDER
# ==============================
output_path = os.path.join(base_dir, "all_data.json")

with open(output_path, "w") as f:
    json.dump(output, f)

print("DONE → all_data.json created at:")
print(output_path)
print("Total files processed:", len(output))
