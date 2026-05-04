import requests

url = "http://127.0.0.1:5000/predict"

files = {
    "image": open(r"C:\Users\Lenovo\Documents\project_images\final_dataset\val\images\istockphoto-872889176-1024x1024_jpg.rf.4c575f11e5e308e234a9e761e40df308.jpg", "rb")  # put your image path here
}

response = requests.post(url, files=files)

print(response.json())