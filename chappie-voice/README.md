# Voz para chappie-bot

Asistente de voz que corre en tu compu (no en el navegador). Te escucha
esperando la palabra **"Chappie"**, y después:

- Si le pedís abrir algo ("abrí la calculadora", "abrime youtube y poné
  tal cosa", "abrime gmail") lo abre de verdad — programas de Windows
  o páginas web, en pestaña/ventana nueva.
- Si le pedís que aprenda algo puntual ("acordate que me gusta el mate")
  se lo guarda directo, sin pasar por el chat.
- Cualquier otra cosa se la manda al mismo bot de la interfaz web y te
  lee la respuesta en voz alta.

Comparte memoria y personalidad con la interfaz web — es el mismo
`server.js`, solo que ahora también le podés hablar.

## Instalación (Windows)

1. Necesitás **Python 3.10 o más nuevo**. Si no lo tenés, bajalo de
   https://www.python.org/downloads/ — en el instalador, tildá
   **"Add python.exe to PATH"** antes de instalar.

2. Abrí una terminal (cmd) en esta carpeta — igual que hiciste con
   la de `Ollama`: escribí `cmd` en la barra de direcciones del
   explorador de archivos.

3. Instalá las dependencias:
   ```
   pip install -r requirements.txt
   ```

   **Si `PyAudio` falla al instalar** (es común en Windows), corré esto
   en su lugar:
   ```
   pip install pipwin
   pipwin install pyaudio
   ```

4. Windows puede pedirte permiso para que las apps usen el micrófono.
   Si no te aparece el cartel solo, andá a **Configuración > Privacidad
   y seguridad > Micrófono** y asegurate de que esté permitido para
   apps de escritorio.

## Uso

1. Primero prendé el servidor web (en la carpeta `Ollama`):
   ```
   node server.js
   ```
   (esto es necesario para la parte de charla — los comandos de abrir
   cosas funcionan igual aunque esté apagado)

2. En otra terminal, parada en esta carpeta, corré:
   ```
   python chappie_voz.py
   ```

3. Vas a escuchar "Chappie listo...". A partir de ahí, decile cosas
   empezando siempre con su nombre, por ejemplo:
   - "Chappie, abrí la calculadora"
   - "Chappie, abrime youtube y poné bohemian rhapsody"
   - "Chappie, abrime gmail"
   - "Chappie, acordate que estudio en el ISPI 4041"
   - "Chappie, ¿qué opinás del mate?"

4. Para cortar el programa: Ctrl+C en la terminal, o decile "Chappie,
   chau".

## Cosas a tener en cuenta

- El reconocimiento de voz usa un servicio gratuito de Google por
  internet (no hace falta API key, pero sí conexión). Si no tenés
  internet en ese momento, no va a entender nada.
- Solo reacciona si decís la palabra "Chappie" en la frase — así evita
  activarse con conversaciones de fondo.
- Los programas que sabe abrir están en la lista `APPS` dentro de
  `chappie_voz.py` — le podés agregar más renglones ahí si usás otro
  programa seguido (el nombre que reconoce por voz, y el comando que
  Windows usa para abrirlo).
- Los sitios web que sabe abrir están en la lista `SITES`, mismo
  archivo — también extensible.
