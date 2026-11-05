export default function SearchFilter({ search, category, categories, onSearchChange, onCategoryChange }) {
  return (
    <div className="toolbar">
      <input
        type="search"
        className="input"
        placeholder="Search by product name…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label="Search products by name"
      />
      <select
        className="input"
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((item) => (
          <option key={item.category} value={item.category}>
            {item.category} ({item.count})
          </option>
        ))}
      </select>
    </div>
  );
}
