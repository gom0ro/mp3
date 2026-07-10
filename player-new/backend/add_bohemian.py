import os
import subprocess
import httpx

def main():
    print("Downloading Bohemian Rhapsody...")
    url = "https://www.youtube.com/watch?v=fJ9rUzIMcZQ"
    subprocess.run([
        "python", "-m", "yt_dlp", 
        "-f", "bestaudio", 
        "-o", "bohemian.%(ext)s", 
        url
    ], check=True)
    
    print("Getting API token...")
    files = [f for f in os.listdir() if f.startswith("bohemian.")]
    if not files:
        print("File not found")
        return
    filename = files[0]

    client = httpx.Client(base_url="http://localhost:8000/api/v1")
    try:
        res = client.post("/auth/register", json={"email": "bot@vibe.com", "username": "Bot", "password": "password"})
        print("Reg:", res.text)
    except Exception as e:
        print("Reg error:", e)
    
    resp = client.post("/auth/token", data={"username": "bot@vibe.com", "password": "password"})
    print("Token resp:", resp.text)
    token = resp.json().get("access_token")
    if not token:
        return
    
    print("Uploading to backend...")
    with open(filename, "rb") as f:
        req_files = {"file": ("Bohemian Rhapsody." + filename.split('.')[-1], f, "audio/" + filename.split('.')[-1])}
        res = client.post(
            "/tracks/upload", 
            files=req_files, 
            params={"title": "Bohemian Rhapsody", "artist": "Queen"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=180.0
        )
        
    print(res.status_code, res.text)
    print("Done!")

if __name__ == "__main__":
    main()
