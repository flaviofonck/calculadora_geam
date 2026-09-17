# Bandeja de entrada

Pega aquí los reportes **tal como te llegan**: el mensaje de un usuario, un ticket, un
correo reenviado, un pantallazo descrito con palabras. No los formatees — de eso se
encarga el director.

Cuando tengas algo pegado:

```powershell
cd orquestador
.\ciclo.ps1 --sembrar
```

Ese turno los convierte en tareas del backlog con su código `T-0XX`, sus criterios de
*Done when* medibles y su estado, y **vacía este archivo**. Lo que ya está en el backlog no
se vuelve a sembrar.

Cuanto más contexto pegues, mejor sale la tarea. Lo que más ayuda:

- **Quién lo reporta** y con qué usuario, si lo sabes.
- **Sobre qué registro o cliente** pasó, y **cuándo**.
- **Qué esperaba ver y qué vio.** Esa diferencia es el criterio de la tarea.
- El mensaje de error tal cual, si lo hay.

Si un reporte queda tan incompleto que no se puede convertir sin inventar, el director lo
deja aquí y te dice en el buzón qué le falta.

---

<!-- Pega debajo de esta línea -->
