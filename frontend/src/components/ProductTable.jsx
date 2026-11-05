import { useState } from "react";

function ProductImage({ src, name }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className="thumb thumb-empty">{name.charAt(0).toUpperCase()}</div>;
  }
  return <img className="thumb" src={src} alt={name} onError={() => setFailed(true)} />;
}

const priceFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function ProductTable({ products, loading, editingId, deletingId, onEdit, onDelete }) {
  if (loading && products.length === 0) {
    return <div className="empty">Loading products…</div>;
  }

  if (products.length === 0) {
    return <div className="empty">No products found.</div>;
  }

  return (
    <div className={`table-wrap ${loading ? "is-refreshing" : ""}`}>
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th className="num">Price</th>
            <th className="num">Stock</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className={product.id === editingId ? "row-editing" : ""}>
              <td>
                <div className="product-cell">
                  <ProductImage key={product.image_url} src={product.image_url} name={product.name} />
                  <div>
                    <div className="product-name">{product.name}</div>
                    {product.description && (
                      <div className="product-desc">{product.description}</div>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <span className="badge">{product.category}</span>
              </td>
              <td className="num">{priceFormatter.format(Number(product.price))}</td>
              <td className="num">
                <span className={product.stock_quantity === 0 ? "stock-out" : ""}>
                  {product.stock_quantity}
                </span>
              </td>
              <td className="actions-col">
                <div className="row-actions">
                  <button type="button" className="btn btn-small" onClick={() => onEdit(product.id)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => onDelete(product)}
                    disabled={deletingId === product.id}
                  >
                    {deletingId === product.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
