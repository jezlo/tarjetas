# Tarjetas - Flashcard App

Una aplicación web para aprender usando tarjetas de estudio (flashcards) con autenticación de usuarios, categorías de decks, estadísticas y almacenamiento en SQLite.

## Características

✨ **Tarjetas de 2 caras**: pregunta en el frente, respuesta en el reverso
📊 **Estadísticas**: seguimiento de aciertos y fallos
🏷️ **Decks/Categorías**: organiza tus tarjetas por temas
👤 **Autenticación**: crea una cuenta y sincroniza tus datos
📥 **Importación**: carga tarjetas desde CSV
✏️ **Carga manual**: añade tarjetas una por una

## Estructura del Proyecto

```
tarjetas/
├── backend/                    # API Flask
│   ├── app.py                 # Punto de entrada
│   ├── config.py              # Configuración
│   ├── models/                # Modelos SQLAlchemy
│   │   ├── __init__.py
│   │   ├── user.py            # Modelo Usuario
│   │   ├── deck.py            # Modelo Deck/Categoría
│   │   └── card.py            # Modelo Tarjeta
│   ├── routes/                # Rutas API
│   │   ├── __init__.py
│   │   ├── auth.py            # Autenticación
│   │   ├── decks.py           # Gestión de decks
│   │   ├── cards.py           # Gestión de tarjetas
│   │   └── stats.py           # Estadísticas
│   ├── services/              # Lógica de negocio
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── csv_service.py     # Importación CSV
│   │   └── stats_service.py
│   └── migrations/            # Migraciones BD
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas
│   │   ├── services/          # Servicios API
│   │   ├── context/           # Context API
│   │   ├── App.jsx
│   │   └── index.jsx
│   └── public/
├── requirements.txt            # Dependencias Python
├── package.json               # Dependencias Node
└── README.md
```

## Instalación

### Backend

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Iniciar servidor
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh` - Refrescar token JWT

### Decks
- `GET /api/decks` - Listar decks del usuario
- `POST /api/decks` - Crear nuevo deck
- `PUT /api/decks/<id>` - Actualizar deck
- `DELETE /api/decks/<id>` - Eliminar deck

### Tarjetas
- `GET /api/decks/<deck_id>/cards` - Listar tarjetas de un deck
- `POST /api/decks/<deck_id>/cards` - Crear tarjeta
- `PUT /api/cards/<id>` - Actualizar tarjeta
- `DELETE /api/cards/<id>` - Eliminar tarjeta

### Importación
- `POST /api/decks/<deck_id>/import-csv` - Importar tarjetas desde CSV

### Estadísticas
- `GET /api/stats/deck/<deck_id>` - Estadísticas de un deck
- `GET /api/stats/overall` - Estadísticas generales

## Formato CSV para Importación

```csv
pregunta,respuesta
¿Cuál es la capital de Francia?,París
¿Cuál es 2+2?,4
```

## Tecnologías

- **Backend**: Python, Flask, SQLAlchemy, SQLite
- **Frontend**: React, TailwindCSS
- **Autenticación**: JWT (JSON Web Tokens)
- **Base de datos**: SQLite

## Desarrollo

Para contribuir al proyecto, por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la licencia MIT - ver el archivo LICENSE para más detalles.