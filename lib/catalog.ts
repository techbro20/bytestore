import {
  readCatalog,
  type CatalogProduct,
  type CatalogCategory,
  type CatalogTool,
} from './catalog-store';

export type Product = CatalogProduct;
export type Category = CatalogCategory & { count: number };
export type Tool = CatalogTool;

export async function getCatalogData() {
  return readCatalog();
}

export async function getProducts() {
  const catalog = await readCatalog();
  return catalog.products;
}

export async function getProductBySlug(slug: string) {
  const products = await getProducts();
  return products.find((p) => p.slug === slug);
}

export async function filterProducts(options: {
  category?: string | null;
  filter?: string | null;
}) {
  let result = await getProducts();

  if (options.category) {
    result = result.filter((p) => p.category === options.category);
  }

  if (options.filter === 'bestsellers') {
    result = result.filter((p) => p.bestseller);
  }

  if (options.filter === 'new') {
    result = result.filter((p) => p.newArrival);
  }

  return result;
}

export async function getCategories(): Promise<Category[]> {
  const catalog = await readCatalog();
  const counts = catalog.products.reduce<Record<string, number>>((acc, product) => {
    acc[product.category] = (acc[product.category] ?? 0) + 1;
    return acc;
  }, {});

  return catalog.categories.map((meta) => ({
    ...meta,
    count: counts[meta.slug] ?? 0,
  }));
}

export async function getCategoryBySlug(slug: string) {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug);
}

export async function getTools() {
  const catalog = await readCatalog();
  return catalog.tools;
}

/** @deprecated Prefer async getProducts — kept for rare sync client fallbacks. */
export const products: Product[] = [];
