# Assessment Preparation Guide


## Stage 1 – The big picture

```
Browser (React, :5173)                      Django (:8000)                       SQLite
──────────────────────                      ──────────────                       ──────
User clicks "Add product"
  → ProductForm validates the input
  → App.handleSubmit()
  → api/products.js createProduct()
  → fetch POST /api/products/  ──JSON──►  config/urls.py   "api/" → products.urls
                                          products/urls.py  router → ProductViewSet
                                          ProductViewSet.create()
                                          ProductSerializer(data=...).is_valid()
                                            ✗ invalid → 400 {"price": ["..."]}
                                            ✓ valid   → serializer.save()
                                                         → Product.objects.create() ──► INSERT INTO products_product
  ◄──JSON── 201 {"id": 7, ...}  ◄────────  Response(serializer.data)
  → setNotice("…was added") and refresh()
  → the useEffect re-runs and calls GET /api/products/
```

Learn this diagram well enough to draw it on a whiteboard. It answers demo questions 1 to 3.

---

## Stage 2 – Backend files

### `backend/config/settings.py`
- **What:** project configuration.
- **Why:** it registers `rest_framework`, `corsheaders` and `products`, reads secrets from `.env`, and points to SQLite.
- **Key lines:** `load_dotenv(BASE_DIR / ".env")`, `INSTALLED_APPS`, `CorsMiddleware` **first** in `MIDDLEWARE`, `CORS_ALLOWED_ORIGINS`.
- **Live change:** "Allow another frontend port." Add it to `CORS_ALLOWED_ORIGINS` in `.env` and restart.

### `backend/products/models.py`
- **What:** the `Product` table definition. Each field becomes a database column.
- **Why:** the ORM uses it to create the table (through migrations) and to build SQL for you.
- `id` is not written in the model. Django adds `BigAutoField` automatically (see `DEFAULT_AUTO_FIELD`).
- `auto_now_add=True` sets `created_at` once, on insert.
- `MinValueValidator(0)` is the business rule "cannot be negative".
- `ordering = ["-created_at"]` puts the newest products first.
- **Live change:** "Add a `sku` field." Add `sku = models.CharField(max_length=50, blank=True)`, run `makemigrations` and `migrate`, add `"sku"` to the serializer `fields`, then add it to the form and `EMPTY_PRODUCT`.

### `backend/products/serializers.py`
- **What:** converts `Product` objects to JSON and JSON to validated Python data.
- **Why:** it is the validation gate. Nothing reaches the database without passing `is_valid()`.
- **How rules are applied**, in order:
  1. Field validation built from the model (required, max_length, URLField, min_value 0)
  2. `validate_<field>()` methods (blank-after-trim check for name and category)
  3. `validate()` for rules involving several fields (none needed yet)
- **Gotcha worth explaining:** DRF turns the model's `MinValueValidator` into its own `min_value` check. That is why the friendly message is set again in `extra_kwargs`.
- **Live change:** "Price must be at most 1,000,000." Add `def validate_price(self, value): if value > 1_000_000: raise serializers.ValidationError(...)`.

### `backend/products/views.py`
- **What:** `ProductViewSet(ModelViewSet)` gives `list`, `create`, `retrieve`, `update`, `partial_update` and `destroy` without extra code.
- **Why a viewset:** one class, five endpoints, standard behaviour (404s, 201s, 204s).
- `get_queryset()` reads `?search=` and `?category=` from the URL and chains `.filter()` calls. Querysets are **lazy**: no SQL runs until DRF iterates them.
  - `name__icontains` becomes `WHERE name LIKE '%x%'` (case-insensitive)
  - `category__iexact` is a case-insensitive exact match
- `@action(detail=False) categories` is a custom endpoint at `/products/categories/` that uses `values().annotate(Count())`, i.e. `GROUP BY`.
- **Live change:** "Add a minimum-price filter." In `get_queryset` add `min_price = self.request.query_params.get("min_price")` and then `queryset = queryset.filter(price__gte=min_price)`.

### `backend/products/urls.py` and `config/urls.py`
- `DefaultRouter().register("products", ProductViewSet)` generates `products/` and `products/<pk>/`.
- `config/urls.py` mounts them under `api/`, giving `/api/products/`.

### `backend/products/migrations/`
- These are generated files that describe how to build or alter the table. `0001` creates it, and `0002` changed the validator messages. They are committed, so anyone can recreate the database with `migrate`.

### `backend/products/tests.py`
- `APITestCase` uses a separate, temporary test database, so your real data is never touched.
- Run with `python manage.py test products`.

---

## Stage 3 – Frontend files

### `src/api/products.js`
- **What:** the only file that knows the API's URL. It has one function per endpoint.
- **Why:** components call `createProduct(values)` instead of building `fetch` calls everywhere.
- `request()` is a shared helper:
  - `fetch` **only rejects on network failure**, so a 400 or 404 still resolves. That is why we check `response.ok` ourselves.
  - A 400 throws an `ApiError` carrying DRF's field errors. A failed network call throws "Cannot reach the server".
  - A 204 (delete) has no body, so it returns `null` before trying `response.json()`.

### `src/App.jsx` (the "brain")
- **State (`useState`):** `products`, `categories`, `loading`, `loadError`, `notice`, `search`, `debouncedSearch`, `category`, `editing`, `deletingId`, `reloadKey`.
- **Effect 1 (debounce):** waits 300 ms after typing stops before searching. The cleanup cancels the previous timer.
- **Effect 2 (load data):** runs when `debouncedSearch`, `category` or `reloadKey` changes. It uses `Promise.all` to fetch products and categories in parallel. The `ignore` flag stops a slow old response from overwriting newer results.
- **`refresh()`** bumps `reloadKey`, which re-runs Effect 2. That is how the list updates after add, edit and delete without a page reload.
- **`handleEdit(id)`** calls `GET /products/{id}/`, puts the result in `editing`, and the form re-mounts with those values.
- **`handleDelete(product)`** calls `window.confirm`, then `DELETE`, then `refresh()`.
- **`key` on `<ProductForm>`:** changing the key (`new` to `edit-5`) makes React create a fresh form. This is the simplest way to load new initial values.

### `src/components/ProductForm.jsx`
- Controlled inputs: `value={values.x}` and `onChange={handleChange}`.
- `validate()` gives instant feedback. Server errors returned by `onSubmit` are shown under the same fields.
- `noValidate` turns off the browser's own popups, so our messages are used consistently.

### `src/components/ProductTable.jsx`
- Renders rows with `.map()` and `key={product.id}`.
- `ProductImage` falls back to a letter if the URL is empty or fails to load (`onError`).

### `src/components/SearchFilter.jsx` and `Alert.jsx`
- "Dumb" components: they receive values and callbacks through props and hold no state of their own.

---

## Stage 4 – Demo answers (practise saying these out loud)

1. **How does React talk to Django?**
   React calls functions in `api/products.js`, which use `fetch` with JSON bodies and `async/await`. Django is on a different port, so the browser treats it as a different origin. `django-cors-headers` adds `Access-Control-Allow-Origin` for the React URL listed in `.env`. There is no page reload: React updates its state with the response and re-renders.

2. **How does Django process a request?**
   The URL router matches `/api/products/5/` to `ProductViewSet` with `pk=5`. The HTTP method picks the action (GET → `retrieve`, PUT → `update`, DELETE → `destroy`). The viewset gets the object from `get_queryset()` (404 if missing), runs it through the serializer, and returns a `Response` with the right status code.

3. **How is data stored and retrieved?**
   Through the Django ORM. `serializer.save()` calls `Product.objects.create()` or `instance.save()`, which produce `INSERT` and `UPDATE` statements. Reads use `Product.objects.filter(...)`, which produces `SELECT ... WHERE`. SQLite keeps it all in `db.sqlite3`, a file on disk, which is why data survives a restart. Migrations define the table schema.

4. **How do validation and error handling work?**
   There are two layers. The frontend `validate()` blocks obvious mistakes instantly. The backend serializer is the real guard, because the API can be called without our UI. Invalid data gets `400` and `{field: [messages]}`, which `api/products.js` turns into an `ApiError`, and the form shows each message under its field. Network failures show "Cannot reach the server" with a retry button. A 404 (for example, a product deleted in another tab) shows a friendly message and refreshes the list.

5. **How would you support multiple sellers and orders?**
   - Add a `Seller` model, or use Django's `User`, and add `seller = ForeignKey(User, on_delete=CASCADE, related_name="products")` to `Product`.
   - Add authentication (DRF `TokenAuthentication` or JWT) and make `get_queryset()` return `Product.objects.filter(seller=request.user)` for the seller dashboard. Set `serializer.save(seller=request.user)` in `perform_create`.
   - Add a custom permission, `IsOwnerOrReadOnly`, so sellers can only edit their own products.
   - Orders: `Order(buyer FK, status, created_at, total)` plus `OrderItem(order FK, product FK, quantity, unit_price)`. Store `unit_price` on the item so later price changes don't rewrite history.
   - When placing an order, use `transaction.atomic()` and `select_for_update()` (or `F("stock_quantity") - qty`) to reduce stock safely, so two buyers can't buy the last item.
   - Production: PostgreSQL, pagination, image uploads to object storage.

---

## Stage 5 – Practice exercises

Do each one **without looking at the reference code**, then compare. Bring me your attempts and I'll review them.

**Warm-up (backend)**
1. From an empty folder: create a venv, install Django and DRF, start the project and app, and write the `Product` model. Target: 10 minutes.
2. Write the serializer and viewset and register the router. Test with the browsable API at `/api/products/`. Target: 10 minutes.
3. Add `?search=` and `?category=` to `get_queryset`. Then add `?in_stock=true` (stock > 0).
4. Make negative price return exactly `"Price cannot be negative."`. Explain why `validate_price` alone doesn't work when the model has `MinValueValidator`.

**Frontend**
5. Write `api/products.js` with `getProducts` and `createProduct` using `async/await`. Make a 400 response throw an error that contains the field messages.
6. Build `App` with `useState` and `useEffect` that loads and lists products with a loading message.
7. Add the form with validation. On success, clear the form and refresh the list.
8. Add Edit: load the product into the form, then PUT. Hint: the `key` trick.
9. Add Delete with `window.confirm`.
10. Add debounced search. Explain what the effect's cleanup function does.

**Likely live-change requests**
11. "Show low-stock products (< 5) in orange." (frontend only, about 3 minutes)
12. "Sort by price." (backend: `?ordering=price` with `queryset.order_by(...)`, plus a frontend select)
13. "Add a `sku` field that must be unique." (model with `unique=True` → migration → serializer → form)
14. "Show the total stock value (price × stock)." (frontend `reduce`, or backend `aggregate(Sum(F("price") * F("stock_quantity")))`)

**Time plan for the real assessment (120 min)**

| Minutes | Task |
|---------|------|
| 0–10 | venv, installs, startproject, startapp, settings (DRF, CORS) |
| 10–30 | model, migrations, serializer, viewset, urls; test in browsable API |
| 30–40 | `npm create vite`, the `api.js` helper |
| 40–80 | list, form, edit, delete, search and filter |
| 80–95 | loading and error states, styling |
| 95–110 | run the 9 test scenarios, fix bugs |
| 110–120 | README |

---

## Stage 6 – Requirement checklist

Legend: ✅ completed and tested · 🟡 implemented, not fully tested · ❌ not implemented

### Backend
| Requirement | Status | Evidence |
|---|---|---|
| Product model with all 8 fields | ✅ | `models.py`, migration 0001 |
| Create | ✅ | unit test + live curl (201) |
| List all | ✅ | unit test + live curl |
| Retrieve by ID | ✅ | unit test + live curl, 404 tested |
| Update (PUT) | ✅ | unit test + live curl |
| Delete | ✅ | unit test + live curl (204, then 404) |
| Search by name | ✅ | unit test + live curl |
| Filter by category | ✅ | unit test + live curl |
| Price and stock not negative | ✅ | unit tests + live curl (400 with clear message) |
| ORM, serializers, viewsets, routing | ✅ | |
| Persistence across restart | ✅ | server stopped and restarted, 5 products still listed |

### Frontend
| Requirement | Status | Evidence |
|---|---|---|
| Table with name, category, price, stock | 🟡 | code written, build passes; not clicked through in a browser |
| Images where available | 🟡 | fallback placeholder included; not visually checked |
| Total product count | 🟡 | header stat from `/categories/` counts |
| Add form + required-field validation | 🟡 | |
| Success and error messages | 🟡 | |
| Edit loads current values, then PUT | 🟡 | |
| Delete with confirmation, then refresh | 🟡 | |
| Search and filter without reload | 🟡 | |
| Loading and error states | 🟡 | |
| Hooks, async/await, components | ✅ | code review; lint clean |

**Why 🟡:** every API call the UI makes was verified with curl, and the app builds and is served. But the screens themselves were not clicked through in a browser in this session. **Do this yourself** by following the 9 README scenarios in the UI. Each 🟡 becomes ✅ once you have seen it work.

### Deliverables
| Item | Status |
|---|---|
| Backend source, frontend source | ✅ |
| Database configuration and migrations | ✅ |
| README with setup, API docs and examples | ✅ |
| `.env` / `.env.example` / `.gitignore` | ✅ |

## Things that could cost marks (and the fix)

- **Forgetting CORS** makes every request fail in the browser with "Cannot reach the server". Install `django-cors-headers`, add it to `INSTALLED_APPS`, put `CorsMiddleware` at the **top** of `MIDDLEWARE`, and set `CORS_ALLOWED_ORIGINS`.
- **Forgetting `makemigrations` / `migrate`** gives "no such table: products_product".
- **Treating a 400 as success:** `fetch` doesn't throw on 400, so always check `response.ok`.
- **Calling `response.json()` on a 204** throws, so return early for DELETE.
- **The edit form doesn't update when another product is picked** if you use `useState(initialValues)` without a changing `key`.
- **Not being able to explain the code** loses marks. Rebuild it yourself at least twice before the assessment.
- **Integrity:** in the real assessment, write the code yourself and follow the organisers' rules on AI tools.
