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

type Tab = 'categories' | 'products' | 'tools';

export default function AdminDashboard() {
  const { notify } = useToast();
  const { refresh: refreshAdminSession } = useAdminSession();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<Tab>('products');
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
  const [toolForm, setToolForm] = useState({
    id: '',
    title: '',
    body: '',
    href: '/shop',
    image: '',
  });

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
    if (!productForm.category && categories.length > 0 && !productForm.id) {
      setProductForm((p) => ({ ...p, category: categories[0].slug }));
    }
  }, [categories, productForm.category, productForm.id]);

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
    const category = productForm.category.trim() || categories[0]?.slug || '';
    if (!title) {
      setError('Enter a product title.');
      return;
    }
    if (!category) {
      setError('Select a category (add one under Categories first if needed).');
      return;
    }
    if (!productForm.image) {
      setError('Add a product image before saving.');
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
    setProductForm({ ...emptyProduct, category: categories[0]?.slug || '' });
    notify(
      wasEdit
        ? `Product “${title}” updated successfully`
        : `Product “${title}” added successfully`,
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

  const saveTool = async (e: FormEvent) => {
    e.preventDefault();
    if (!toolForm.image) {
      setError('Add a tool image before saving.');
      return;
    }
    setBusy(true);
    setError(null);
    const method = toolForm.id ? 'PUT' : 'POST';
    const wasEdit = Boolean(toolForm.id);
    const title = toolForm.title.trim();
    const res = await fetch('/api/admin/tools', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolForm),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed');
      return;
    }
    setToolForm({ id: '', title: '', body: '', href: '/shop', image: '' });
    notify(
      wasEdit
        ? `Tool “${title}” updated successfully`
        : `Tool “${title}” added successfully`,
    );
    await loadAll();
  };

  const deleteTool = async (id: string) => {
    if (!confirm('Delete this tool?')) return;
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
            Add, edit, or delete shop categories, products, and tools.
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
            ['products', 'Products'],
            ['categories', 'Categories'],
            ['tools', 'Tools'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-2 text-sm ${
              tab === id
                ? 'bg-orange-500 text-white'
                : 'border border-neutral-300/70 bg-white/40 dark:border-neutral-600 dark:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

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
            {categories.map((c) => (
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

      {tab === 'products' ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <form
            onSubmit={saveProduct}
            className="space-y-3 rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/40"
          >
            <h3 className="font-medium">
              {productForm.id ? 'Edit product' : 'Add product'}
            </h3>
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
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
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
              label="Product image"
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
                {productForm.id ? 'Save changes' : 'Add product'}
              </button>
              {productForm.id ? (
                <button
                  type="button"
                  onClick={() =>
                    setProductForm({
                      ...emptyProduct,
                      category: categories[0]?.slug || '',
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
            {products.map((p) => (
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

      {tab === 'tools' ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={saveTool}
            className="space-y-3 rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/40"
          >
            <h3 className="font-medium">
              {toolForm.id ? 'Edit tool' : 'Add tool'}
            </h3>
            <input
              value={toolForm.title}
              onChange={(e) =>
                setToolForm((t) => ({ ...t, title: e.target.value }))
              }
              placeholder="Title"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            <textarea
              value={toolForm.body}
              onChange={(e) =>
                setToolForm((t) => ({ ...t, body: e.target.value }))
              }
              placeholder="Description"
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            <input
              value={toolForm.href}
              onChange={(e) =>
                setToolForm((t) => ({ ...t, href: e.target.value }))
              }
              placeholder="Link href e.g. /shop?category=call-center"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            <ImagePicker
              label="Tool image"
              imageUrl={toolForm.image}
              required
              onPick={async (file) => {
                try {
                  const url = await uploadImage(file);
                  if (url) setToolForm((t) => ({ ...t, image: url }));
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Upload failed');
                }
              }}
              onClear={() => setToolForm((t) => ({ ...t, image: '' }))}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white"
              >
                {toolForm.id ? 'Save tool' : 'Add tool'}
              </button>
              {toolForm.id ? (
                <button
                  type="button"
                  onClick={() =>
                    setToolForm({
                      id: '',
                      title: '',
                      body: '',
                      href: '/shop',
                      image: '',
                    })
                  }
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
          <ul className="space-y-2">
            {tools.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-neutral-300/60 bg-white/45 p-4 dark:border-neutral-600/50 dark:bg-neutral-900/35"
              >
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t.body}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{t.href}</p>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setToolForm({
                        id: t.id,
                        title: t.title,
                        body: t.body,
                        href: t.href,
                        image: t.image || '',
                      })
                    }
                    className="text-orange-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTool(t.id)}
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

