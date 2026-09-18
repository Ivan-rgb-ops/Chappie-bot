# chappie-bot (motor)

Prototipo del "cerebro" del bot: memoria persistente + estado de personalidad
que muta con el uso. Todavía sin interfaz — se prueba por terminal.

## Setup

1. Creá una API key en https://ollama.com (sección **API keys** de tu cuenta,
   plan Free)
2. Copiá `.env.example` a `.env` y pegá tu key ahí
3. `npm start` (necesita Node 20.6 o superior — usa `--env-file`, sin
   dependencias externas)

## Cómo se prueba

- Escribile normal y responde según sus rasgos actuales
- `/enseñar <texto>` — le suma un hecho o lección a la memoria
- `/mas <rasgo>` o `/menos <rasgo>` — ajusta `curiosidad`, `cautela`, `humor`
  o `empatia`
- `/estado` — muestra los rasgos actuales
- `/salir` — termina

El estado completo (rasgos + lecciones + historial) se guarda en
`data/state.json` y persiste entre sesiones — cerrás la terminal y la
personalidad sigue donde quedó.

## Por qué así

- El "cerebro" (`ollama-client.js`) está aislado del resto: cambiar de Ollama
  Cloud a la API de Claude más adelante es tocar un solo archivo
- Los rasgos se inyectan en el system prompt en cada turno
  (`personality-engine.js`), así que el comportamiento cambia de verdad, no
  solo lo que "recuerda"
- La persistencia es un JSON plano por ahora — alcanza para probar el
  mecanismo antes de meter una base de datos

## Próximos pasos

- Reemplazar `/mas` y `/menos` manuales por algo más orgánico (reacciones
  tipo 👍/👎 en la UI)
- Pasar `data/state.json` a una base real (SQLite para arrancar)
- Armar la interfaz en React
