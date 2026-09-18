import os
import webbrowser
import urllib.request
import re

APPS = {
    "bloc de notas": "notepad",
    "calculadora": "calc",
    "paint": "mspaint",
    "explorador": "explorer",
    "word": "winword",
    "excel": "excel",
    "chrome": "chrome",
    "brave": "brave",
    "spotify": "spotify"
}

def open_app(name: str):
    app_name = name.lower().strip()
    if app_name in APPS:
        os.system(f'start "" {APPS[app_name]}')
    else:
        print(f"[ACTIONS] Intentando abrir app genérica: '{app_name}'...")
        os.system(f'start {app_name}')
    return True

def open_site(url: str):
    print(f"[ACTIONS] Abriendo sitio web: {url}")
    webbrowser.open(url)
    return True

def play_youtube(query: str):
    print(f"[ACTIONS] Buscando y auto-reproduciendo en YouTube: '{query}'...")
    try:
        # Formateamos el texto y nos disfrazamos de navegador para que YouTube no nos bloquee
        search_keyword = query.replace(" ", "+")
        req = urllib.request.Request(
            f"https://www.youtube.com/results?search_query={search_keyword}", 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        html = urllib.request.urlopen(req)
        
        # Atrapamos el código (ID) del primer video de la lista de resultados
        video_ids = re.findall(r"watch\?v=(\S{11})", html.read().decode())
        
        if video_ids:
            # Armamos el link directo al video y lo abrimos
            url = f"https://www.youtube.com/watch?v={video_ids[0]}"
            webbrowser.open(url)
            return True
        else:
            print("[ACTIONS] No se encontraron videos.")
            return False
    except Exception as e:
        print(f"[ACTIONS] Error buscando en YouTube: {e}")
        return False

def activate_mode(mode_name: str):
    mode = mode_name.lower()
    print(f"\n[ACTIONS] 🌟 Preparando el entorno para: {mode.upper()}")