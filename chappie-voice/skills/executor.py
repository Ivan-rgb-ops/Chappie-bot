from actions import open_app, open_site, activate_mode, play_youtube

def execute(actions):
    if not actions:
        return

    for action in actions:
        tool = action.get("tool")
        parameters = action.get("parameters", {})

        print(f"[EXECUTOR] Ejecutando: {tool}")

        if tool == "open_app":
            open_app(parameters.get("name", ""))
            
        elif tool == "open_site":
            open_site(parameters.get("url", ""))
            
        elif tool == "play_youtube":
            play_youtube(parameters.get("query", ""))
            
        elif tool == "activate_mode":
            activate_mode(parameters.get("mode_name", ""))
            
        else:
            print(f"Herramienta desconocida: {tool}")