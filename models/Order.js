{/* ==================================================
    ITEMS
================================================== */}

<div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">

  <h3 className="mb-4 font-display text-base font-bold text-ink-900">
    অর্ডার আইটেম (
    {(editing ? form.items : order.items)?.length || 0}
    )
  </h3>

  {!editing ? (
    <div className="divide-y divide-mist-100">
      {Array.isArray(order.items) &&
        order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 py-3.5">
            <img
              src={item.productImage}
              alt={item.productName || "Product"}
              className="h-16 w-16 flex-shrink-0 rounded-xl bg-mist-100 object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNmMWY1ZjkiLz48L3N2Zz4=";
              }}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">
                {item.productName || "Unnamed Product"}
              </p>

              <p className="text-xs text-slate-400">
                Qty: {item.quantity || 0}
              </p>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-semibold text-ink-900">
                {currency(
                  (Number(item.price) || 0) * (Number(item.quantity) || 0)
                )}
              </p>

              <p className="text-[11px] text-slate-400">
                {currency(item.price)} / প্রতিটি
              </p>
            </div>
          </div>
        ))}
    </div>
  ) : (
    <div className="divide-y divide-mist-100">
      {form.items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <img
            src={item.productImage}
            alt={item.productName || "Product"}
            className="h-14 w-14 flex-shrink-0 rounded-xl bg-mist-100 object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB3aWR0aD0