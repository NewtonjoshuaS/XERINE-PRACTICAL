# Mini Marketplace – Product Management System

A small full-stack app that lets a seller add, view, edit, delete, search and filter products.
The backend is a Django REST API that stores data in SQLite. The frontend is a React single-page app that talks to the API with `fetch`.

```
XERINE PRACTICAL/
├── backend/            Django project
│   ├── config/         settings.py (reads .env), root urls.py
│   ├── products/       model, serializer, viewset, urls, tests, migrations
│   ├── .env            local secrets (not committed)
│   ├── .env.example    template for .env
│   └── requirements.txt
├── frontend/           React app (Vite)
│   ├── src/api/products.js       every call to the API
│   ├── src/components/           ProductForm, ProductTable, SearchFilter, Alert
│   ├── src/App.jsx               page state and data loading
│   ├── .env / .env.example       API base URL
│   └── package.json
└── .gitignore
```

## Technologies

| Layer    | Tools |
|----------|-------|
| Backend  | Python 3.13, Django 6.1, Django REST Framework 3.18, django-cors-headers, python-dotenv |
| Database | SQLite (through the Django ORM) |
| Frontend | React 19, JavaScript (ES modules, async/await), Vite 8 |

## Features

- **Product dashboard**: a table with image, name, description, category, price and stock. It also shows the total product count and the number of categories.
- **Add product**: a form with frontend validation, inline field errors, and success or error messages.
- **Edit product**: clicking *Edit* loads the product from `GET /api/products/{id}/` into the form, and saving sends a `PUT`.
- **Delete product**: asks for confirmation first, then refreshes the list.
- **Search by name**: live, with a 300 ms debounce, and no page reload.
- **Filter by category**: a dropdown filled from the database, with counts.
- **Loading and error states**: a loading message, a dimmed table while refreshing, a "Cannot reach the server" message with a *Try again* button, and per-field API errors shown under the inputs.
- **Validation on both sides**: see [Validation rules](#validation-rules).

## Setup

You need Python 3.10+ and Node.js 18+.

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env        # macOS/Linux: cp .env.example .env
```

Edit `backend/.env` and set `DJANGO_SECRET_KEY` to a long random string. You can generate one with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

| Variable | Purpose | Default |
|----------|---------|---------|
| `DJANGO_SECRET_KEY` | Django signing key | insecure dev key |
| `DJANGO_DEBUG` | `True` shows detailed errors | `False` |
| `DJANGO_ALLOWED_HOSTS` | comma-separated hostnames | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | frontend URLs allowed to call the API | `http://localhost:5173,http://127.0.0.1:5173` |

### 2. Database and migrations

```bash
python manage.py migrate          # creates backend/db.sqlite3 and the products table
python manage.py createsuperuser  # optional, for the Django admin at /admin/
```

If you change `products/models.py`, run `python manage.py makemigrations` and then `python manage.py migrate`.

### 3. Run the backend

```bash
python manage.py runserver
```

The API is now available at http://127.0.0.1:8000/api/products/. Opening it in a browser shows DRF's browsable API.

### 4. Frontend

In a second terminal:

```bash
cd frontend
npm install
copy .env.example .env            # macOS/Linux: cp .env.example .env
npm run dev
```

Open http://localhost:5173. `frontend/.env` holds `VITE_API_URL=http://127.0.0.1:8000/api`.

## API endpoints

Base URL: `http://127.0.0.1:8000/api`

| Method | URL | Description | Success |
|--------|-----|-------------|---------|
| GET    | `/products/` | List all products, newest first | 200 |
| GET    | `/products/?search=phone` | Products whose name contains "phone" (case-insensitive) | 200 |
| GET    | `/products/?category=Electronics` | Products in a category (case-insensitive) | 200 |
| GET    | `/products/?search=x&category=y` | Both filters combined | 200 |
| POST   | `/products/` | Create a product | 201 |
| GET    | `/products/{id}/` | Get one product | 200 / 404 |
| PUT    | `/products/{id}/` | Replace all editable fields | 200 / 400 / 404 |
| PATCH  | `/products/{id}/` | Update only the fields sent | 200 / 400 / 404 |
| DELETE | `/products/{id}/` | Delete a product | 204 / 404 |
| GET    | `/products/categories/` | Each category with its product count | 200 |

### Product fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | integer | – | auto-generated, read-only |
| `name` | string (max 200) | yes | cannot be blank or spaces only |
| `description` | text | no | |
| `category` | string (max 100) | yes | cannot be blank or spaces only |
| `price` | decimal (10 digits, 2 decimal places) | yes | must be ≥ 0 |
| `stock_quantity` | integer | yes | must be ≥ 0 |
| `image_url` | URL (max 500) | no | must be a valid URL if given |
| `created_at` | ISO datetime | – | set automatically, read-only |

### Example requests

Create:

```bash
curl -X POST http://127.0.0.1:8000/api/products/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Desk Lamp","description":"LED lamp","category":"Home","price":"19.99","stock_quantity":5,"image_url":"https://example.com/lamp.jpg"}'
```

```json
{"id": 7, "name": "Desk Lamp", "description": "LED lamp", "category": "Home",
 "price": "19.99", "stock_quantity": 5, "image_url": "https://example.com/lamp.jpg",
 "created_at": "2026-11-05T11:07:20.751027Z"}
```

Update price and stock:

```bash
curl -X PUT http://127.0.0.1:8000/api/products/7/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Desk Lamp","description":"LED lamp","category":"Home","price":"17.50","stock_quantity":12,"image_url":""}'
```

Search and filter:

```bash
curl "http://127.0.0.1:8000/api/products/?search=lamp"
curl "http://127.0.0.1:8000/api/products/?category=home"
```

Delete:

```bash
curl -X DELETE http://127.0.0.1:8000/api/products/7/     # 204 No Content
```

Invalid input returns `400` with an error list for each field:

```bash
curl -X POST http://127.0.0.1:8000/api/products/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Bad","category":"X","price":"-5","stock_quantity":-2}'
```

```json
{"price": ["Price cannot be negative."],
 "stock_quantity": ["Stock quantity cannot be negative."]}
```

> In Windows PowerShell, use `curl.exe` instead of `curl`, or test from the browsable API page.

## Validation rules

| Rule | Frontend (`ProductForm.jsx`) | Backend (model + `serializers.py`) |
|------|------------------------------|------------------------------------|
| Name required, not blank | ✔ | ✔ |
| Category required, not blank | ✔ | ✔ |
| Price required, numeric, ≥ 0 | ✔ | ✔ (`MinValueValidator(0)`) |
| Price has at most 2 decimal places | – (the API error is shown inline) | ✔ (`DecimalField`) |
| Stock required, whole number, ≥ 0 | ✔ | ✔ (`MinValueValidator(0)`) |
| Image URL valid if given | ✔ | ✔ (`URLField`) |

The frontend checks give the user instant feedback. The backend checks are what actually protect the data, because anyone can call the API directly. When the backend rejects a request, the form shows its messages under the matching fields.

## Testing

### Automated backend tests

```bash
cd backend
python manage.py test products
```

There are 13 tests covering create, list, retrieve, 404, update, delete, search, category filter, negative price, negative stock, missing required fields, a blank name, and the categories endpoint.

**Last run: 13 tests, all passing.**

### Manual test checklist (the interviewer's scenarios)

| # | Scenario | How | Result |
|---|----------|-----|--------|
| 1 | Add a product | POST via API | ✔ passed (201) |
| 2 | View the new product | GET `/products/{id}/` | ✔ passed |
| 3 | Search for it | GET `?search=blend` | ✔ passed |
| 4 | Edit price and stock | PUT | ✔ passed, values updated |
| 5 | Filter by category | GET `?category=kitchen` | ✔ passed |
| 6 | Delete it | DELETE, then GET | ✔ passed (204, then 404) |
| 7 | Negative price | POST `price=-5` | ✔ passed (400, clear message) |
| 8 | Negative stock | POST `stock_quantity=-1` | ✔ passed (400, clear message) |
| 9 | Restart backend, data remains | stopped and restarted `runserver`, then listed products | ✔ passed (all 5 products still there) |
| – | CORS from React's origin | request with `Origin: http://127.0.0.1:5173` | ✔ `Access-Control-Allow-Origin` header returned |
| – | Frontend build | `npm run build` and `npx oxlint src` | ✔ builds, no lint warnings |

These scenarios were run against the live API with `curl`, which sends the same requests the React app sends. The React screens should still be clicked through by hand in a browser before the demo. See below.

## Known limitations / incomplete work

- **UI not clicked through in a browser.** The React app builds, is served, and calls endpoints that were all verified. Nobody has yet clicked through the screens (add, edit, delete confirmation, search and filter, error messages) in a real browser. Do this once before the demo.
- **No frontend automated tests.** Only the backend has automated tests.
- **No authentication.** Anyone who can reach the API can change products. This is acceptable for the assessment but not for production.
- **No pagination.** The list endpoint returns every matching product, which is fine for a small catalogue.
- **Categories are free text.** "Electronics" and "electronics " are stored as typed. Leading and trailing spaces are trimmed, and filtering ignores case. The form suggests existing categories to reduce duplicates.
- **Images are URLs only.** There is no file upload. A broken image URL falls back to a letter placeholder.
- **Development server only.** `runserver` and `npm run dev` are not production servers.
