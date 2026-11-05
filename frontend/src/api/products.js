// All communication with the Django REST API lives in this file.
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Error thrown for any failed request. `fieldErrors` holds DRF's
// per-field validation messages, e.g. { price: ["Price cannot be negative."] }.
export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    // fetch only rejects on network failure (server down, CORS blocked, etc.)
    throw new ApiError("Cannot reach the server. Is the Django backend running?", 0);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 400 && data && typeof data === "object") {
      throw new ApiError("Please correct the highlighted fields.", 400, data);
    }
    if (response.status === 404) {
      throw new ApiError("Product not found. It may have been deleted.", 404);
    }
    throw new ApiError(data?.detail || `Request failed (${response.status}).`, response.status);
  }
  return data;
}
