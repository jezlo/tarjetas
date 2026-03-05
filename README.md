# Project Documentation

## Overview
This project is designed to ...

## Setup Instructions
1. Clone the repository:
   ```
   git clone https://github.com/jezlo/tarjetas.git
   ```
2. Navigate to the project directory:
   ```
   cd tarjetas
   ```
3. Install the required dependencies:
   ```
   npm install
   ```

## API Documentation
### Endpoints
- **GET /api/items**: Retrieves a list of items.
- **POST /api/items**: Creates a new item.
   
### Example Request
```json
{
  "name": "New Item",
  "description": "Description of the new item."
}
```

### Example Response
```json
{
  "id": 1,
  "name": "New Item",
  "description": "Description of the new item."
}
```