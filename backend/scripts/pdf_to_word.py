import sys
import os
from pdf2docx import Converter

def convert_pdf_to_word(pdf_path, docx_path):
    try:
        # Ensure the output directory exists
        output_dir = os.path.dirname(docx_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Convert using pdf2docx
        cv = Converter(pdf_path)
        cv.convert(docx_path, start=0, end=None)
        cv.close()
        print("SUCCESS")
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("ERROR: Missing arguments. Usage: python pdf_to_word.py <input_pdf> <output_docx>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    docx_path = sys.argv[2]
    convert_pdf_to_word(pdf_path, docx_path)
