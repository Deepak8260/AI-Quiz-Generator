import os

# Define internal folders
folders = [
    "helpers",
    "assets"
]

# Define files to be created (empty)
files = [
    ".env",
    "README.md",
    "main.py",
    "requirements.txt",
    "helpers/__init__.py",
    "helpers/gemini_api.py"
]

# Create folders
for folder in folders:
    os.makedirs(folder, exist_ok=True)

# Create empty files
for file in files:
    with open(file, "w", encoding="utf-8") as f:
        pass

print("✅ Project structure created successfully inside quiz_generator_gemini!")
