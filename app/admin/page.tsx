'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ImagePlus, X } from 'lucide-react';
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogTool,
} from '@/lib/catalog-store';
import { useToast } from '@/components/ui/Toast';
import { useAdminSession } from '@/lib/admin-session';
import { uploadFiles } from '@/lib/uploadthing';
import OrdersPanel from '@/components/admin/OrdersPanel';
import { TOOLS_CATEGORY } from '@/lib/tools-category';

type Tab = 'orders' | 'categories' | 'products' | 'tools';

export default function AdminDashboard() {
  const { notify } = useToast();
  const { refresh: refreshAdminSession } = useAdminSession();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<Tab>('orders');
  const [awaitingReview, setAwaitingReview] = useState(0);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [tools, setTools] = useState<CatalogTool[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [catTitle, setCatTitle] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const emptyProduct = useMemo(
    () => ({
      id: '',
      title: '',
      description: '',
      category: '',
      price: 0,
      bestseller: false,
      newArrival: false,
      content: '',
      image: '',
      slug: '',
    }),
    [],
  );
  const [productForm, setProductForm] = useState(emptyProduct);
  const [convertPrices, setConvertPrices] = useState<Record<string, string>>({});
  const isToolsTab = tab === 'tools';
  const shopCategories = categories.filter((c) => c.slug !== TOOLS_CATEGORY.slug);
  const listedProducts = products.filter((p) =>
    isToolsTab
      ? p.category === TOOLS_CATEGORY.slug
      : p.category !== TOOLS_CATEGORY.slug,
  );

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setProductForm({
      ...emptyProduct,
      category:
        next === 'tools' ? TOOLS_CATEGORY.slug : shopCategories[0]?.slug || '',
    });
  };

  const loadAll = useCallback(async () => {
    const res = await fetch('/api/catalog', { cache: 'no-store' });
    const data = await res.json();
    setCategories(data.categories || []);
    setProducts(data.products || []);
    setTools(data.tools || []);
  }, []);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d: { authenticated: boolean }) => {
        setAuthed(d.authenticated);
        if (d.authenticated) void loadAll();
      })
      .catch(() => setAuthed(false));
  }, [loadAll]);

  useEffect(() => {
    if (tab === 'tools' || productForm.category || productForm.id) return;
    const first = categories.find((c) => c.slug !== TOOLS_CATEGORY.slug);
    if (first) setProductForm((p) => ({ ...p, category: first.slug }));
  }, [tab, categories, productForm.category, productForm.id]);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Invalid admin password');
      return;
    }
    setAuthed(true);
    setPassword('');
    await refreshAdminSession();
    await loadAll();
  };

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setAuthed(false);
    await refreshAdminSession();
  };

  const uploadImage = async (file: File | null) => {
    if (!file) return '';
    const res = await uploadFiles('productImage', { files: [file] });
    const uploaded = res[0];
    if (!uploaded) throw new Error('Upload failed');
    return uploaded.ufsUrl || uploaded.url;
  };

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const title = catTitle.trim();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: catDesc }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed');
      return;
    }
    setCatTitle('');
    setCatDesc('');
    notify(`Category “${title}” added successfully`);
    await loadAll();
  };

  const deleteCategory = async (slug: string) => {
    if (!confirm(`Delete category "${slug}" and its products?`)) return;
    const res = await fetch(
      `/api/admin/categories?slug=${encodeURIComponent(slug)}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      setError('Could not delete category');
      return;
    }
    notify('Category deleted successfully');
    await loadAll();
  };

  const saveProduct = async (e: FormEvent) => {
    e.preventDefault();
    const title = productForm.title.trim();
    const noun = isToolsTab ? 'Tool' : 'Product';
    const category = isToolsTab
      ? TOOLS_CATEGORY.slug
      : productForm.category.trim() || shopCategories[0]?.slug || '';
    if (!title) {
      setError(`Enter a ${noun.toLowerCase()} title.`);
      return;
    }
    if (!(productForm.price > 0)) {
      setError(`Enter a price for this ${noun.toLowerCase()}.`);
      return;
    }
    if (!category) {
      setError('Select a category (add one under Categories first if needed).');
      return;
    }
    if (!productForm.image) {
      setError(`Add a ${noun.toLowerCase()} image before saving.`);
      return;
    }
    setBusy(true);
    setError(null);
    const method = productForm.id ? 'PUT' : 'POST';
    const wasEdit = Boolean(productForm.id);
    const payload = { ...productForm, title, category };
    const res = await fetch('/api/admin/products', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed');
      return;
    }
    setProductForm({
      ...emptyProduct,
      category: isToolsTab ? TOOLS_CATEGORY.slug : shopCategories[0]?.slug || '',
    });
    notify(
      wasEdit
        ? `${noun} “${title}” updated successfully`
        : `${noun} “${title}” added successfully`,
    );
    await loadAll();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setError('Could not delete product');
      return;
    }
    notify('Product deleted successfully');
    await loadAll();
  };

  const convertTool = async (id: string, title: string) => {
    const price = Number(convertPrices[id]);
    if (!(price > 0)) {
      setError(`Enter a price for “${title}” before converting.`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/tools', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, price }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Could not convert tool');
      return;
    }
    setConvertPrices((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
    notify(`“${title}” is now a tool for sale at $${price.toFixed(2)}`);
    await loadAll();
  };

  const deleteTool = async (id: string) => {
    if (!confirm('Delete this old link-only tool?')) return;
    const res = await fetch(`/api/admin/tools?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setError('Could not delete tool');
      return;
    }
    notify('Tool deleted successfully');
    await loadAll();
  };

  if (authed === null) {
    return <p className="p-8 text-sm text-neutral-500">Checking session…</p>;
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md space-y-4 pb-10">
        <h2 className="text-2xl font-medium text-neutral-900 dark:text-white">
          Admin login
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Sign in to manage the store catalog.
        </p>
        <form onSubmit={login} className="space-y-3 rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/40">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-lg border border-neutral-300 bg-white/80 px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
          >
            Sign in
          </button>
        </form>
        <Link href="/" className="text-sm text-orange-600 hover:underline">
          Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-medium text-neutral-900 dark:text-white">
            Admin dashboard
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Review orders and manage shop categories, products, and tools.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600"
        >
          Log out
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['orders', 'Orders'],
            ['products', 'Products'],
            ['categories', 'Categories'],
            ['tools', 'Tools'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              tab === id
                ? 'bg-orange-500 text-white'
                : 'border border-neutral-300/70 bg-white/40 dark:border-neutral-600 dark:bg-white/5'
            }`}
          >
            {label}
            {id === 'orders' && awaitingReview > 0 ? (
              <span
                className={`rounded-full px-1.5 text-[11px] font-semibold ${
                  tab === id ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'
                }`}
              >
                {awaitingReview}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'orders' ? <OrdersPanel onCountChange={setAwaitingReview} /> : null}

      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {tab === 'categories' ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={addCategory}
            className="space-y-3 rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/40"
          >
            <h3 className="font-medium">Add category</h3>
            <input
              value={catTitle}
              onChange={(e) => setCatTitle(e.target.value)}
              placeholder="Title"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            <textarea
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Description"
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white"
            >
              Add category
            </button>
          </form>
          <ul className="space-y-2">
            {shopCategories.map((c) => (
              <li
                key={c.slug}
                className="flex items-start justify-between gap-3 rounded-xl border border-neutral-300/60 bg-white/45 p-4 dark:border-neutral-600/50 dark:bg-neutral-900/35"
              >
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-neutral-500">{c.slug}</p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {c.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteCategory(c.slug)}
                  className="text-sm text-red-600"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'products' || tab === 'tools' ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <form
            onSubmit={saveProduct}
            className="space-y-3 rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/40"
          >
            <h3 className="font-medium">
              {isToolsTab
                ? productForm.id
                  ? 'Edit tool'
                  : 'Add tool'
                : productForm.id
                  ? 'Edit product'
                  : 'Add product'}
            </h3>
            {isToolsTab ? (
              <p className="text-xs text-neutral-500">
                Tools are sold like products — shown on the Tools page, in the
                shop under “Tools”, and in the Telegram bot.
              </p>
            ) : null}
            <input
              value={productForm.title}
              onChange={(e) =>
                setProductForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Title"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            <input
              value={productForm.description}
              onChange={(e) =>
                setProductForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Short description"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            {isToolsTab ? null : (
              <select
                value={productForm.category}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, category: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              >
                <option value="" disabled>
                  Select category
                </option>
                {shopCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">
                Price (USD)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={productForm.price || ''}
                onChange={(e) =>
                  setProductForm((p) => ({
                    ...p,
                    price: Number(e.target.value),
                  }))
                }
                placeholder="0.00"
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              />
              <span className="mt-1 block text-xs text-neutral-500">
                Listing price only — customers choose quantity in cart / checkout.
              </span>
            </label>
            <textarea
              value={productForm.content}
              onChange={(e) =>
                setProductForm((p) => ({ ...p, content: e.target.value }))
              }
              placeholder="Longer product details"
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            <ImagePicker
              label={isToolsTab ? 'Tool image' : 'Product image'}
              imageUrl={productForm.image}
              required
              onPick={async (file) => {
                try {
                  const url = await uploadImage(file);
                  if (url) setProductForm((p) => ({ ...p, image: url }));
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Upload failed');
                }
              }}
              onClear={() => setProductForm((p) => ({ ...p, image: '' }))}
            />
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={productForm.bestseller}
                  onChange={(e) =>
                    setProductForm((p) => ({
                      ...p,
                      bestseller: e.target.checked,
                    }))
                  }
                />
                Bestseller
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={productForm.newArrival}
                  onChange={(e) =>
                    setProductForm((p) => ({
                      ...p,
                      newArrival: e.target.checked,
                    }))
                  }
                />
                New arrival
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white"
              >
                {productForm.id
                  ? 'Save changes'
                  : isToolsTab
                    ? 'Add tool'
                    : 'Add product'}
              </button>
              {productForm.id ? (
                <button
                  type="button"
                  onClick={() =>
                    setProductForm({
                      ...emptyProduct,
                      category: isToolsTab
                        ? TOOLS_CATEGORY.slug
                        : shopCategories[0]?.slug || '',
                    })
                  }
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <ul className="space-y-2">
            {listedProducts.length === 0 ? (
              <li className="rounded-xl border border-dashed border-neutral-300/70 p-6 text-center text-sm text-neutral-500 dark:border-neutral-600/50">
                {isToolsTab ? 'No tools yet.' : 'No products yet.'}
              </li>
            ) : null}
            {listedProducts.map((p) => (
              <li
                key={p.id}
                className="flex gap-3 rounded-xl border border-neutral-300/60 bg-white/45 p-3 dark:border-neutral-600/50 dark:bg-neutral-900/35"
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-orange-500/10 text-[10px] uppercase text-orange-500">
                    {p.category.slice(0, 6)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-sm text-neutral-500">
                    ${p.price.toFixed(2)} · {p.category}
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm({
                        id: p.id,
                        title: p.title,
                        description: p.description,
                        category: p.category,
                        price: p.price,
                        bestseller: p.bestseller,
                        newArrival: p.newArrival,
                        content: p.content,
                        image: p.image || '',
                        slug: p.slug,
                      })
                    }
                    className="text-orange-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProduct(p.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'tools' && tools.length > 0 ? (
        <section className="space-y-2 rounded-2xl border border-amber-300/60 bg-amber-500/5 p-4 dark:border-amber-700/50">
          <h3 className="text-sm font-medium">Old link-only tools</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            These were added before tools had prices and cannot be bought yet.
            Enter a price and click Convert — the title, description and image
            are kept.
          </p>
          <ul className="space-y-2">
            {tools.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-300/60 bg-white/45 p-3 dark:border-neutral-600/50 dark:bg-neutral-900/35"
              >
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="truncate text-xs text-neutral-500">{t.body}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={convertPrices[t.id] ?? ''}
                    onChange={(e) =>
                      setConvertPrices((p) => ({ ...p, [t.id]: e.target.value }))
                    }
                    placeholder="Price $"
                    aria-label={`Price for ${t.title}`}
                    className="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                  />
                  <button
                    type="button"
                    disabled={busy || !(Number(convertPrices[t.id]) > 0)}
                    onClick={() => convertTool(t.id, t.title)}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Convert
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTool(t.id)}
                    className="text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ImagePicker({
  label,
  imageUrl,
  required,
  onPick,
  onClear,
}: {
  label: string;
  imageUrl: string;
  required?: boolean;
  onPick: (file: File) => Promise<void>;
  onClear: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {required ? <span className="text-orange-500"> *</span> : null}
      </p>
      {imageUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="h-32 w-32 rounded-xl border border-neutral-300 object-cover dark:border-neutral-600"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-2 -right-2 rounded-full bg-neutral-900 p-1 text-white shadow"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <label className="mt-2 block cursor-pointer text-xs font-medium text-orange-600 hover:underline">
            Replace image
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await onPick(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-300/80 bg-orange-500/5 px-4 py-8 text-center transition-colors hover:border-orange-500 hover:bg-orange-500/10 dark:border-orange-700/60">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400">
            <ImagePlus className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            Click to add an image
          </span>
          <span className="text-xs text-neutral-500">
            PNG, JPG, or WebP · max 4MB · cloud storage
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await onPick(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}

