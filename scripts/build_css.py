import os
import sys
import platform
import urllib.request
import subprocess

def main():
    # Detect platform
    system = platform.system().lower()
    machine = platform.machine().lower()
    
    # Map to Tailwind binary names
    
    target = None
    if system == "windows":
        if "64" in machine:
            target = "windows-x64.exe"
        else:
            target = "windows-x86.exe"
    elif system == "darwin":
        if "arm" in machine or "aarch64" in machine:
            target = "macos-arm64"
        else:
            target = "macos-x64"
    elif system == "linux":
        if "arm" in machine or "aarch64" in machine:
            target = "linux-arm64"
        elif "64" in machine:
            target = "linux-x64"
        else:
            target = "linux-armv7"
            
    if not target:
        print(f"Unsupported platform: {system} {machine}")
        sys.exit(1)
        
    # Set directories relative to this script's path (assumed to be in scripts/)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bin_dir = os.path.join(base_dir, "bin")
    if not os.path.exists(bin_dir):
        os.makedirs(bin_dir)
        
    bin_name = "tailwindcss.exe" if system == "windows" else "tailwindcss"
    bin_path = os.path.join(bin_dir, bin_name)
    
    # Download binary if not exists
    if not os.path.exists(bin_path):
        version = "v3.4.1"
        url = f"https://github.com/tailwindlabs/tailwindcss/releases/download/{version}/tailwindcss-{target}"
        print(f"Downloading standalone Tailwind CLI from {url}...")
        try:
            # Use a custom user agent to avoid being blocked by github release downloads on some systems
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req) as response:
                with open(bin_path, 'wb') as out_file:
                    out_file.write(response.read())
                    
            # Make executable on Unix
            if system != "windows":
                os.chmod(bin_path, 0o755)
            print("Download successful.")
        except Exception as e:
            print(f"Failed to download Tailwind CLI: {e}")
            sys.exit(1)
            
    # Run the compiler command
    cmd = [
        bin_path,
        "-i", os.path.join(base_dir, "templates", "tailwind_input.css"),
        "-o", os.path.join(base_dir, "static", "css", "tailwind.css"),
        "--minify"
    ]
    print(f"Compiling CSS: {' '.join(cmd)}")
    try:
        # Run process
        subprocess.run(cmd, check=True)
        print("CSS compiled successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Compilation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
