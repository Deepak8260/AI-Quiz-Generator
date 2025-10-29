from pdf2image import convert_from_path
import os

# Create certificates directory if it doesn't exist
os.makedirs("static/certificates", exist_ok=True)

# Convert PDF to PNG
images = convert_from_path("static/certificates/cert.pdf")
images[0].save("static/certificates/cert.png", "PNG")