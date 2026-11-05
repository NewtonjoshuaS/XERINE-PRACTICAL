import { useEffect, useRef, useState } from "react";
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProduct,
  getProducts,
  updateProduct,
} from "./api/products";
import Alert from "./components/Alert";
import ProductForm from "./components/ProductForm";
import { EMPTY_PRODUCT } from "./emptyProduct";
import ProductTable from "./components/ProductTable";
import SearchFilter from "./components/SearchFilter";

export default function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState({ type: "success", message: "" });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");

  // null = "add" mode; otherwise { id, values } for the product being edited.
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Bumping this number re-runs the fetch effect after a create/update/delete.
  const [reloadKey, setReloadKey] = useState(0);
  const formRef = useRef(null);

  // Wait until the user pauses typing before searching, so we don't send a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // Ignore responses that arrive after a newer request has started.
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const [productData, categoryData] = await Promise.all([
          getProducts({ search: debouncedSearch, category }),
          getCategories(),
        ]);
        if (!ignore) {
          setProducts(productData);
          setCategories(categoryData);
          setLoadError("");
        }
      } catch (error) {
        if (!ignore) setLoadError(error.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [debouncedSearch, category, reloadKey]);

  const totalProducts = categories.reduce((sum, item) => sum + item.count, 0);
  const isFiltered = Boolean(debouncedSearch.trim() || category);

  function showNotice(type, message) {
    setNotice({ type, message });
  }

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  // Returns DRF field errors so the form can display them, or null on success.
  async function handleSubmit(values) {
    try {
      if (editing) {
        const saved = await updateProduct(editing.id, values);
        showNotice("success", `"${saved.name}" was updated.`);
        setEditing(null);
      } else {
        const saved = await createProduct(values);
        showNotice("success", `"${saved.name}" was added.`);
      }
      refresh();
      return null;
    } catch (error) {
      showNotice("error", error.message);
      return error.fieldErrors && Object.keys(error.fieldErrors).length ? error.fieldErrors : null;
    }
  }

  async function handleEdit(id) {
    try {
      // Load the latest copy from the API rather than trusting the possibly stale list row.
      const product = await getProduct(id);
      setEditing({
        id: product.id,
        values: {
          name: product.name,
          description: product.description ?? "",
          category: product.category,
          price: String(product.price),
          stock_quantity: String(product.stock_quantity),
          image_url: product.image_url ?? "",
        },
      });
      setNotice({ type: "success", message: "" });
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showNotice("error", error.message);
      refresh();
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      if (editing?.id === product.id) setEditing(null);
      showNotice("success", `"${product.name}" was deleted.`);
    } catch (error) {
      showNotice("error", error.message);
    } finally {
      setDeletingId(null);
      refresh();
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Mini Marketplace</h1>
          <p className="subtitle">Product management dashboard</p>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="stat-value">{totalProducts}</span>
            <span className="stat-label">Total products</span>
          </div>
          <div className="stat">
            <span className="stat-value">{categories.length}</span>
            <span className="stat-label">Categories</span>
          </div>
        </div>
      </header>

      <Alert
        type={notice.type}
        message={notice.message}
        onClose={() => setNotice((current) => ({ ...current, message: "" }))}
      />

      <main className="layout">
        <section ref={formRef} className="form-column">
          <ProductForm
            key={editing ? `edit-${editing.id}` : "new"}
            initialValues={editing ? editing.values : EMPTY_PRODUCT}
            isEditing={Boolean(editing)}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </section>

        <section className="card list-column">
          <div className="list-header">
            <h2>Products</h2>
            <span className="muted">
              {loading
                ? "Loading…"
                : isFiltered
                  ? `Showing ${products.length} of ${totalProducts}`
                  : `${products.length} product${products.length === 1 ? "" : "s"}`}
            </span>
          </div>

          <SearchFilter
            search={search}
            category={category}
            categories={categories}
            onSearchChange={setSearch}
            onCategoryChange={setCategory}
          />

          {loadError ? (
            <div className="empty">
              <p>{loadError}</p>
              <button type="button" className="btn" onClick={refresh}>
                Try again
              </button>
            </div>
          ) : (
            <ProductTable
              products={products}
              loading={loading}
              editingId={editing?.id}
              deletingId={deletingId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </section>
      </main>
    </div>
  );
}
