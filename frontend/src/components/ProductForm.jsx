import { useState } from "react";
import { EMPTY_PRODUCT } from "../emptyProduct";

// Mirrors the backend rules so the user gets instant feedback.
// The backend still validates everything, because the API can be called directly.
function validate(values) {
  const errors = {};

  if (!values.name.trim()) errors.name = "Product name is required.";
  if (!values.category.trim()) errors.category = "Category is required.";

  if (values.price === "") {
    errors.price = "Price is required.";
  } else if (Number.isNaN(Number(values.price))) {
    errors.price = "Price must be a number.";
  } else if (Number(values.price) < 0) {
    errors.price = "Price cannot be negative.";
  }

  if (values.stock_quantity === "") {
    errors.stock_quantity = "Stock quantity is required.";
  } else if (!Number.isInteger(Number(values.stock_quantity))) {
    errors.stock_quantity = "Stock quantity must be a whole number.";
  } else if (Number(values.stock_quantity) < 0) {
    errors.stock_quantity = "Stock quantity cannot be negative.";
  }

  if (values.image_url.trim()) {
    try {
      new URL(values.image_url.trim());
    } catch {
      errors.image_url = "Enter a valid URL, e.g. https://example.com/image.jpg";
    }
  }

  return errors;
}

export default function ProductForm({ initialValues, isEditing, onSubmit, onCancel, categories }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    const payload = {
      ...values,
      name: values.name.trim(),
      category: values.category.trim(),
      image_url: values.image_url.trim(),
      stock_quantity: Number(values.stock_quantity),
    };

    // onSubmit returns the API's field errors (if any) so they can be shown inline.
    const serverErrors = await onSubmit(payload);
    setSubmitting(false);

    if (serverErrors) {
      const flattened = {};
      for (const [field, messages] of Object.entries(serverErrors)) {
        flattened[field] = Array.isArray(messages) ? messages.join(" ") : String(messages);
      }
      setErrors(flattened);
    } else if (!isEditing) {
      setValues(EMPTY_PRODUCT);
    }
  }

  function field(name, label, input) {
    return (
      <div className={`field ${errors[name] ? "has-error" : ""}`}>
        <label htmlFor={name}>{label}</label>
        {input}
        {errors[name] && <div className="field-error">{errors[name]}</div>}
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>{isEditing ? "Edit product" : "Add product"}</h2>

      {field(
        "name",
        "Product name *",
        <input id="name" name="name" className="input" value={values.name} onChange={handleChange} maxLength={200} />,
      )}

      {field(
        "category",
        "Category *",
        <>
          <input
            id="category"
            name="category"
            className="input"
            list="category-options"
            value={values.category}
            onChange={handleChange}
            maxLength={100}
          />
          <datalist id="category-options">
            {categories.map((item) => (
              <option key={item.category} value={item.category} />
            ))}
          </datalist>
        </>,
      )}

      <div className="field-row">
        {field(
          "price",
          "Price *",
          <input id="price" name="price" type="number" step="0.01" className="input" value={values.price} onChange={handleChange} />,
        )}
        {field(
          "stock_quantity",
          "Stock quantity *",
          <input id="stock_quantity" name="stock_quantity" type="number" step="1" className="input" value={values.stock_quantity} onChange={handleChange} />,
        )}
      </div>

      {field(
        "image_url",
        "Image URL",
        <input id="image_url" name="image_url" type="url" className="input" placeholder="https://…" value={values.image_url} onChange={handleChange} />,
      )}

      {field(
        "description",
        "Description",
        <textarea id="description" name="description" className="input" rows={3} value={values.description} onChange={handleChange} />,
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : isEditing ? "Save changes" : "Add product"}
        </button>
        {isEditing && (
          <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
