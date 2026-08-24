# Proyecto EntradaWeb - Plan de Mejoras

## 1. Objetivo del Proyecto
El objetivo principal de este proyecto es implementar un plan de mejoras integral para **EntradaWeb** (basado en entradaweb.com.ar), una plataforma dedicada a la venta de entradas para eventos. El proyecto busca optimizar las funciones existentes, mejorar significativamente la accesibilidad y modernizar la visualización de la plataforma, integrando un backend robusto y almacenamiento eficiente para brindar una mejor experiencia a los usuarios.

## 2. Equipo de Trabajo
El equipo está compuesto por un líder de equipo (encargado de coordinación y control de calidad) y tres desarrolladores técnicos.

| Rol | Integrante | Responsabilidad Principal |
| :--- | :--- | :--- |
| **Líder de equipo** | Franco Calegari | Coordinación general, gestión de GitHub, revisión de tareas (PRs), definición de prioridades y comunicación. |
| **Desarrolladora Backend** | Carla Fassaneli | Desarrollo del servidor con Node.js/Express, diseño de base de datos y conexión con SpiderWebAPI. |
| **Desarrollador Frontend** | Santiago Morales | Interfaz de usuario en HTML/CSS/JavaScript, accesibilidad y diseño responsive. |
| **Desarrollador Full Stack** | Lucas Profe | Integración frontend-backend, manejo de archivos multimedia (SpiderWeb Storage) y testing general. |

## 3. Tecnologías Utilizadas

| Categoría | Tecnología | Uso en el proyecto |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express | Servidor de la aplicación y definición de rutas/API internas. |
| **Frontend** | HTML / CSS / JavaScript | Estructura, estilo y comportamiento de las nuevas vistas y mejoras de accesibilidad. |
| **Base de Datos** | SQL (vía SpiderWebAPI) | Almacenamiento y consulta de datos de usuarios, eventos y entradas. |
| **API / Infraestructura** | SpiderWebAPI | Base de datos SQL, almacenamiento de archivos (Storage) y, opcionalmente, SpiderIA. |
| **Control de versiones**| GitHub | Repositorio compartido, ramas por funcionalidad y revisión de código (Pull Requests). |

## 4. Uso de SpiderWebAPI
**SpiderWebAPI** es el servicio central utilizado para la base de datos SQL y el almacenamiento de archivos (imágenes de eventos, comprobantes). Todas las peticiones requieren el header `X-API-KEY`.

**Flujo de trabajo:**
1. Crear base de datos SQL en el panel de SpiderWeb y generar la API key para el equipo.
2. Definir tablas (usuarios, eventos, entradas, compras) usando la sección Explorar o el endpoint SQL.
3. Crear un proyecto en el módulo Storage para organizar los archivos subidos.
4. Consumir datos desde el backend (Node.js/Express) mediante `fetch`, enviando siempre la API key.
5. *(Opcional)* Evaluar el uso de los endpoints de SpiderIA para funciones de asistencia inteligente al usuario.

**Endpoints Clave:**
*   `POST /api/v1/query`: Ejecutar consultas SQL sobre la base de datos.
*   `POST /api/v1/storage/projects/:id/files`: Subir archivos (imágenes de eventos, adjuntos).
*   `GET /api/v1/storage/files/:id`: Descargar un archivo almacenado.
*   `POST /api/v1/ia/chat`: *(Opcional)* Enviar mensajes a un modelo de IA para asistencia.

## 5. Delegación de Tareas por Desarrollador

*   **Carla Fassanelli (Backend & Base de Datos):**
    *   Diseñar el esquema de BD (usuarios, eventos, entradas, compras) en SpiderWeb SQL.
    *   Desarrollar la API interna del proyecto con Node.js y Express.
    *   Conectar el backend con SpiderWebAPI mediante el endpoint de consultas (`/api/v1/query`).
    *   Implementar validaciones de datos y manejo seguro de la API key.

*   **Santiago Morales (Frontend & Accesibilidad):**
    *   Rediseñar las vistas principales (listado de eventos, ficha de evento, carrito) en HTML/CSS/JS.
    *   Aplicar buenas prácticas de accesibilidad: contraste, etiquetas ARIA, navegación por teclado y textos alternativos (`alt`).
    *   Mejorar la visualización responsive para dispositivos móviles y tablets.
    *   Optimizar la jerarquía visual de la información (precios, fechas, ubicación).

*   **Lucas Profe (Integración & Testing):**
    *   Integrar el frontend con las rutas del backend desarrolladas por Carla.
    *   Implementar la subida de imágenes de eventos mediante SpiderWeb Storage.
    *   Realizar pruebas funcionales de las nuevas features antes de cada entrega.
    *   Colaborar en la optimización de rendimiento (tiempos de carga, consultas SQL).

*   **Franco Calegari (Líder de Equipo):**
    *   Coordina el trabajo diario, gestiona el repositorio en GitHub (ramas, Issues, PRs), verifica que las mejoras cumplan los criterios de accesibilidad y usabilidad, y comunica avances. No participa en la programación directa.

## 6. Cronograma Estimado (6 Semanas)
El proyecto se organiza en etapas semanales, permitiendo entregas incrementales y revisión continua.

| Etapa | Duración | Actividades | Responsable(s) |
| :--- | :--- | :--- | :--- |
| **1. Análisis y diseño** | Semana 1 | Relevamiento del sitio actual, definición de base de datos y wireframes. | Franco, Carla, Santiago |
| **2. Desarrollo backend** | Semanas 2-3 | Configuración de SpiderWebAPI, modelado de BD y API con Node.js/Express. | Carla |
| **3. Desarrollo frontend** | Semanas 2-4 | Nuevas funciones de usuario, mejoras visuales y accesibilidad. | Santiago |
| **4. Integración** | Semana 5 | Conexión frontend-backend, carga de archivos vía Storage API. | Lucas |
| **5. Testing y ajustes** | Semanas 5-6 | Pruebas funcionales, corrección de errores y ajustes de accesibilidad. | Todo el equipo |
| **6. Entrega y despliegue** | Semana 6 | Revisión final, merge a la rama principal en GitHub y despliegue. | Franco |

## 7. Flujo de Trabajo en GitHub
*   **Rama principal:** Único repositorio con rama `main` protegida.
*   **Ramas de trabajo:** Cada desarrollador trabaja en una rama propia por tarea (ej. `feature/accesibilidad-nav`, `feature/api-eventos`).
*   **Issues:** Las tareas se registran como Issues asignados por el líder a cada desarrollador.
*   **Integración:** Todo cambio se integra mediante **Pull Request (PR)**, el cual debe ser revisado y aprobado por el líder de equipo antes de fusionarlo a `main`.

## 8. Criterios de Accesibilidad (Checklist de Revisión)
Estos criterios guían el desarrollo frontend y sirven de revisión:
*   [ ] Contraste de color adecuado entre texto y fondo (mínimo AA de WCAG).
*   [ ] Textos alternativos (`alt`) en todas las imágenes de eventos.
*   [ ] Navegación completa mediante teclado en formularios de compra.
*   [ ] Tamaños de fuente y botones legibles y adaptados a dispositivos móviles.
*   [ ] Mensajes de error claros y comprensibles en los formularios.

## 9. Consideraciones Finales
Este informe será utilizado como guía de trabajo y base para el seguimiento semanal del proyecto. El líder de equipo revisará el avance, ajustará los tiempos si es necesario y actualizará las prioridades manteniendo como eje central el objetivo de mejorar las funciones, la accesibilidad y la visualización de la plataforma EntradaWeb.
