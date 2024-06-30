import requests
import json
import os
from fpdf import FPDF


def main(request):
    request_json = request.get_json()
    file_path = request_json["filePath"]
    file_name = request_json["fileName"]

    # Download the file from Firebase Storage
    storage_url = f"https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT_ID.appspot.com/o/{file_path.replace('/', '%2F')}?alt=media"
    response = requests.get(storage_url)
    input_file_path = f"/tmp/{file_name}"
    with open(input_file_path, "wb") as f:
        f.write(response.content)

    # Process the file and generate a PDF
    pdf_path = f"/tmp/{file_name}.pdf"
    generate_pdf(input_file_path, pdf_path)

    # Upload the generated PDF back to Firebase Storage
    output_file_path = f"processed/{file_name}.pdf"
    upload_pdf_to_storage(pdf_path, output_file_path)

    # Get the download URL for the generated PDF
    pdf_url = f"https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT_ID.appspot.com/o/{output_file_path.replace('/', '%2F')}?alt=media"

    return json.dumps({"pdfUrl": pdf_url})


def generate_pdf(input_file_path, output_pdf_path):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    with open(input_file_path, "r") as f:
        for line in f:
            pdf.cell(200, 10, txt=line, ln=True)

    pdf.output(output_pdf_path)


def upload_pdf_to_storage(local_path, storage_path):
    from google.cloud import storage

    client = storage.Client()
    bucket = client.get_bucket("YOUR_PROJECT_ID.appspot.com")
    blob = bucket.blob(storage_path)
    blob.upload_from_filename(local_path)
